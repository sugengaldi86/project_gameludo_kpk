-- Menambahkan terminasi game tanpa pemenang dan memperbaiki pion yang masuk
-- langsung ke kotak finish dari jalur utama.

create or replace function public.abandon_local_game(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session game_sessions;
begin
  select * into v_session from game_sessions where room_id = p_room_id for update;
  if not found then raise exception 'Sesi permainan tidak ditemukan'; end if;

  if v_session.status <> 'GAME_OVER' then
    update game_sessions set status = 'ABANDONED', current_dice_value = null, finished_at = now()
    where id = v_session.id;
    update rooms set status = 'abandoned', finished_at = now() where id = p_room_id;
  end if;
  update room_players set is_online = false where room_id = p_room_id;
  delete from guest_room_sessions where room_id = p_room_id;

  return jsonb_build_object('status', case when v_session.status = 'GAME_OVER' then 'GAME_OVER' else 'ABANDONED' end);
end;
$$;

create or replace function public.move_game_pawn(p_room_id uuid, p_pawn_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session game_sessions;
  v_pawn game_pawns;
  v_color text;
  v_old_position integer;
  v_new_position integer;
  v_new_status text;
  v_finished boolean := false;
  v_game_over boolean := false;
  v_global_position integer;
  v_required_finished integer;
  v_finished_count integer;
  v_captured_count integer := 0;
  v_move_result jsonb := null;
begin
  select * into v_session from game_sessions where room_id = p_room_id for update;
  if not found or v_session.status <> 'PAWN_SELECTION' then raise exception 'Pion belum dapat digerakkan'; end if;
  if v_session.current_dice_value not between 1 and 6 then raise exception 'Nilai dadu tidak valid'; end if;

  select * into v_pawn from game_pawns where id = p_pawn_id and game_session_id = v_session.id for update;
  if not found or v_pawn.player_id <> v_session.current_player_id then raise exception 'Pion tidak valid'; end if;
  select color into v_color from room_players where room_id = p_room_id and player_id = v_pawn.player_id;
  if v_color is null then raise exception 'Pemilik pion tidak ditemukan'; end if;

  v_old_position := v_pawn.position;
  v_new_position := v_pawn.position;
  v_new_status := v_pawn.status;
  if v_pawn.status = 'base' then
    v_new_status := 'track';
    v_new_position := 0;
  elsif v_pawn.status = 'track' then
    if v_pawn.position + v_session.current_dice_value <= 51 then
      v_new_position := v_pawn.position + v_session.current_dice_value;
    elsif v_pawn.position + v_session.current_dice_value - 52 <= 5 then
      v_new_position := v_pawn.position + v_session.current_dice_value - 52;
      if v_new_position = 5 then
        v_new_status := 'finished';
        v_finished := true;
      else
        v_new_status := 'home';
      end if;
    else
      raise exception 'Pion harus berhenti tepat di kotak finish';
    end if;
  elsif v_pawn.status = 'home' then
    if v_pawn.position + v_session.current_dice_value > 5 then
      raise exception 'Pion harus berhenti tepat di kotak finish';
    end if;
    v_new_position := v_pawn.position + v_session.current_dice_value;
    if v_new_position = 5 then
      v_new_status := 'finished';
      v_finished := true;
    end if;
  else
    raise exception 'Pion sudah selesai';
  end if;

  update game_pawns set status = v_new_status, position = v_new_position,
    path_index = v_new_position, is_in_base = v_new_status = 'base',
    is_in_home_track = v_new_status = 'home', is_finished = v_new_status = 'finished', updated_at = now()
  where id = p_pawn_id;

  if v_new_status = 'track' then
    v_global_position := (v_new_position + case v_color when 'blue' then 0 when 'red' then 13 when 'green' then 26 else 39 end) % 52;
    if v_global_position <> all(array[0,8,13,21,26,34,39,47]) then
      update game_pawns enemy set status = 'base', position = enemy.pawn_number - 1,
        path_index = null, is_in_base = true, is_in_home_track = false, is_finished = false, updated_at = now()
      from room_players owner
      where enemy.game_session_id = v_session.id
        and enemy.player_id = owner.player_id and owner.room_id = p_room_id
        and enemy.player_id <> v_pawn.player_id and enemy.status = 'track'
        and ((enemy.position + case owner.color when 'blue' then 0 when 'red' then 13 when 'green' then 26 else 39 end) % 52) = v_global_position;
      get diagnostics v_captured_count = row_count;
    end if;
  end if;

  update game_turns set selected_pawn_id = p_pawn_id, old_position = v_old_position,
    new_position = v_new_position, finished_at = now()
  where game_session_id = v_session.id and turn_number = v_session.current_turn_number;

  if v_finished then
    update room_players set score = score + 20, xp_earned = xp_earned + 20
    where room_id = p_room_id and player_id = v_session.current_player_id;
    update profiles set total_score = total_score + 20, total_xp = total_xp + 20,
      level = greatest(1, 1 + ((total_xp + 20) / 100))
    where id = v_session.current_player_id;
  end if;

  select count(*) into v_required_finished from game_pawns
  where game_session_id = v_session.id and player_id = v_session.current_player_id;
  select count(*) into v_finished_count from game_pawns
  where game_session_id = v_session.id and player_id = v_session.current_player_id and status = 'finished';

  if v_required_finished > 0 and v_finished_count = v_required_finished then
    v_game_over := true;
    update game_sessions set status = 'GAME_OVER', winner_player_id = v_session.current_player_id, finished_at = now()
    where id = v_session.id;
    update rooms set status = 'finished', finished_at = now() where id = p_room_id;
  elsif v_session.current_dice_value = 6 then
    update game_sessions set status = 'TURN_START', current_turn_number = current_turn_number + 1,
      current_dice_value = null where id = v_session.id;
    v_move_result := jsonb_build_object('currentPlayerId', v_session.current_player_id,
      'turnNumber', v_session.current_turn_number + 1, 'extraTurn', true);
  else
    update game_sessions set status = 'TURN_END' where id = v_session.id;
    v_move_result := public.advance_game_turn(p_room_id);
  end if;

  return jsonb_build_object('pawnId', p_pawn_id, 'oldPosition', v_old_position,
    'newPosition', v_new_position, 'status', v_new_status, 'finished', v_finished,
    'capturedCount', v_captured_count, 'gameOver', v_game_over,
    'winnerPlayerId', case when v_game_over then v_session.current_player_id else null end,
    'currentPlayerId', coalesce(v_move_result->>'currentPlayerId', v_session.current_player_id::text),
    'turnNumber', coalesce((v_move_result->>'turnNumber')::integer, v_session.current_turn_number),
    'extraTurn', coalesce((v_move_result->>'extraTurn')::boolean, false));
end;
$$;

revoke all on function public.abandon_local_game(uuid) from public, anon, authenticated;
revoke all on function public.move_game_pawn(uuid,uuid) from public, anon, authenticated;
grant execute on function public.abandon_local_game(uuid) to service_role;
grant execute on function public.move_game_pawn(uuid,uuid) to service_role;

