-- Perbaikan integritas game setelah migrasi timer 20260924.

-- Pastikan setiap jawaban selalu memperbarui agregat pembelajaran.
create or replace function public.sync_learning_progress_from_answer()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.learning_progress (
    player_id,
    identify_known_correct, identify_known_total,
    strategy_correct, strategy_total,
    kpk_correct, kpk_total,
    verification_correct, verification_total,
    updated_at
  ) values (
    new.player_id,
    case when new.identify_known_correct then 1 else 0 end,
    case when new.identify_known_correct is null then 0 else 1 end,
    case when new.strategy_correct then 1 else 0 end,
    case when new.strategy_correct is null then 0 else 1 end,
    case when new.is_correct then 1 else 0 end,
    1,
    case when new.verification_correct then 1 else 0 end,
    case when new.verification_correct is null then 0 else 1 end,
    now()
  )
  on conflict (player_id) do update set
    identify_known_correct = learning_progress.identify_known_correct + excluded.identify_known_correct,
    identify_known_total = learning_progress.identify_known_total + excluded.identify_known_total,
    strategy_correct = learning_progress.strategy_correct + excluded.strategy_correct,
    strategy_total = learning_progress.strategy_total + excluded.strategy_total,
    kpk_correct = learning_progress.kpk_correct + excluded.kpk_correct,
    kpk_total = learning_progress.kpk_total + excluded.kpk_total,
    verification_correct = learning_progress.verification_correct + excluded.verification_correct,
    verification_total = learning_progress.verification_total + excluded.verification_total,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists player_answers_sync_learning_progress on public.player_answers;
create trigger player_answers_sync_learning_progress
after insert on public.player_answers
for each row execute function public.sync_learning_progress_from_answer();

-- Rekalkulasi agregat agar jawaban yang dibuat sejak migrasi timer ikut tercatat.
insert into public.learning_progress (
  player_id,
  identify_known_correct, identify_known_total,
  strategy_correct, strategy_total,
  kpk_correct, kpk_total,
  verification_correct, verification_total,
  updated_at
)
select
  pa.player_id,
  count(*) filter (where pa.identify_known_correct is true),
  count(*) filter (where pa.identify_known_correct is not null),
  count(*) filter (where pa.strategy_correct is true),
  count(*) filter (where pa.strategy_correct is not null),
  count(*) filter (where pa.is_correct is true),
  count(*),
  count(*) filter (where pa.verification_correct is true),
  count(*) filter (where pa.verification_correct is not null),
  now()
from public.player_answers pa
group by pa.player_id
on conflict (player_id) do update set
  identify_known_correct = excluded.identify_known_correct,
  identify_known_total = excluded.identify_known_total,
  strategy_correct = excluded.strategy_correct,
  strategy_total = excluded.strategy_total,
  kpk_correct = excluded.kpk_correct,
  kpk_total = excluded.kpk_total,
  verification_correct = excluded.verification_correct,
  verification_total = excluded.verification_total,
  updated_at = now();

-- Instalasi baru dan game berikutnya kembali memakai empat pion seperti aturan UI.
create or replace function public.create_local_game(
  p_players jsonb,
  p_learning_goal text default null,
  p_game_mode text default 'klasik',
  p_duration_minutes integer default 30
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_room rooms;
  v_session game_sessions;
  v_player jsonb;
  v_profile profiles;
  v_players jsonb := '[]'::jsonb;
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_code text;
  v_index integer := 0;
begin
  if jsonb_typeof(p_players) <> 'array' or jsonb_array_length(p_players) not between 2 and 4 then
    raise exception 'Jumlah pemain harus 2 sampai 4';
  end if;

  loop
    v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));
    begin
      insert into rooms (room_code, max_players, game_mode, status, learning_goal, duration_minutes, end_time, started_at)
      values (
        v_code, jsonb_array_length(p_players), p_game_mode, 'playing',
        nullif(trim(p_learning_goal), ''), p_duration_minutes,
        now() + make_interval(mins => p_duration_minutes), now()
      ) returning * into v_room;
      exit;
    exception when unique_violation then
      -- Buat kode baru jika terjadi benturan.
    end;
  end loop;

  for v_player in select value from jsonb_array_elements(p_players)
  loop
    if length(trim(coalesce(v_player->>'name', ''))) not between 1 and 40 then
      raise exception 'Nama pemain wajib diisi (maksimal 40 karakter)';
    end if;
    if coalesce(v_player->>'color', '') not in ('blue', 'green', 'yellow', 'red') then
      raise exception 'Warna pemain tidak valid';
    end if;

    insert into profiles (name, avatar)
    values (trim(v_player->>'name'), left(coalesce(v_player->>'avatar', v_player->>'name'), 1))
    returning * into v_profile;

    insert into room_players (room_id, player_id, display_name, color, seat_number, is_ready, is_online)
    values (v_room.id, v_profile.id, v_profile.name, v_player->>'color', v_index + 1, true, true);

    v_players := v_players || jsonb_build_array(jsonb_build_object(
      'id', v_profile.id, 'name', v_profile.name, 'avatar', v_profile.avatar,
      'color', v_player->>'color', 'token', encode(gen_random_bytes(32), 'hex')
    ));

    if v_index = 0 then
      update rooms set host_player_id = v_profile.id where id = v_room.id;
    end if;
    v_index := v_index + 1;
  end loop;

  insert into game_sessions (room_id, current_player_id, current_turn_number, status, started_at)
  values (v_room.id, (v_players->0->>'id')::uuid, 1, 'TURN_START', now())
  returning * into v_session;

  insert into game_pawns (
    game_session_id, player_id, pawn_number, status, position, path_index,
    is_in_base, is_in_home_track, is_finished
  )
  select v_session.id, (player->>'id')::uuid, pawn_number, 'base', pawn_number - 1,
    null, true, false, false
  from jsonb_array_elements(v_players) player
  cross join generate_series(1, 4) pawn_number;

  insert into learning_progress (player_id)
  select (player->>'id')::uuid from jsonb_array_elements(v_players) player
  on conflict (player_id) do nothing;

  insert into guest_room_sessions (room_id, token_hash)
  values (v_room.id, encode(digest(v_token, 'sha256'), 'hex'));

  return jsonb_build_object(
    'roomCode', v_code, 'roomId', v_room.id, 'sessionId', v_session.id,
    'accessToken', v_token, 'players', v_players
  );
end;
$$;

-- Tambahkan pion yang hilang pada game aktif lama tanpa mengubah posisi pion pertama.
insert into public.game_pawns (
  game_session_id, player_id, pawn_number, status, position, path_index,
  is_in_base, is_in_home_track, is_finished
)
select gs.id, rp.player_id, pawn_number, 'base', pawn_number - 1, null, true, false, false
from public.game_sessions gs
join public.rooms r on r.id = gs.room_id
join public.room_players rp on rp.room_id = r.id
cross join generate_series(1, 4) pawn_number
where r.status = 'playing'
on conflict (game_session_id, player_id, pawn_number) do nothing;

-- Finalisasi berbasis waktu dilakukan atomik di database dan hanya sesudah deadline.
create or replace function public.finalize_expired_game(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_room rooms;
  v_session game_sessions;
  v_winner_id uuid;
begin
  select * into v_room from rooms where id = p_room_id for update;
  if not found then raise exception 'Room tidak ditemukan'; end if;

  select * into v_session from game_sessions where room_id = p_room_id for update;
  if not found then raise exception 'Sesi permainan tidak ditemukan'; end if;

  if v_session.status = 'GAME_OVER' then
    return jsonb_build_object('success', true, 'alreadyEnded', true, 'winnerId', v_session.winner_player_id);
  end if;
  if v_session.status = 'ABANDONED' or v_room.status = 'abandoned' then
    raise exception 'Permainan sudah ditinggalkan';
  end if;
  if v_room.end_time is null or v_room.end_time > now() then
    raise exception 'Waktu permainan belum habis';
  end if;

  select player_id into v_winner_id
  from room_players
  where room_id = p_room_id
  order by score desc, correct_answers desc, joined_at asc
  limit 1;
  if v_winner_id is null then raise exception 'Pemenang tidak dapat ditentukan'; end if;

  update game_sessions
  set status = 'GAME_OVER', winner_player_id = v_winner_id, finished_at = now()
  where id = v_session.id;
  update rooms set status = 'finished', finished_at = now() where id = p_room_id;

  return jsonb_build_object('success', true, 'winnerId', v_winner_id);
end;
$$;
