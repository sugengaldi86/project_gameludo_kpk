-- Aturan permainan: setiap pemain hanya memiliki satu pion.

-- Hapus trigger perbaikan lama apabila sempat diterapkan.
drop trigger if exists guest_room_session_ensure_four_pawns
  on public.guest_room_sessions;

drop function if exists public.ensure_four_pawns_after_room_creation();
drop function if exists public.ensure_four_pawns_for_room(uuid);

create or replace function public.enforce_single_pawn_for_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_session_id uuid;
begin
  select id into v_session_id
  from public.game_sessions
  where room_id = p_room_id
  order by started_at desc nulls last
  limit 1;

  if v_session_id is null then
    return;
  end if;

  -- Pastikan pion utama tersedia.
  insert into public.game_pawns (
    game_session_id, player_id, pawn_number, status, position, path_index,
    is_in_base, is_in_home_track, is_finished
  )
  select
    v_session_id, player.player_id, 1, 'base', 0, null,
    true, false, false
  from public.room_players player
  where player.room_id = p_room_id
  on conflict (game_session_id, player_id, pawn_number) do nothing;

  -- Pion nomor 2-4 bukan bagian dari aturan game ini.
  delete from public.game_pawns
  where game_session_id = v_session_id
    and pawn_number > 1;
end;
$$;

create or replace function public.enforce_single_pawn_after_room_creation()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.enforce_single_pawn_for_room(new.room_id);
  return new;
end;
$$;

-- guest_room_sessions dibuat pada akhir create_local_game, sehingga seluruh
-- pion buatan fungsi versi lama sudah tersedia dan dapat dinormalisasi.
drop trigger if exists guest_room_session_enforce_single_pawn
  on public.guest_room_sessions;

create trigger guest_room_session_enforce_single_pawn
after insert on public.guest_room_sessions
for each row execute function public.enforce_single_pawn_after_room_creation();

-- Normalisasi room yang masih aktif tanpa mengubah riwayat game yang selesai.
do $$
declare
  active_room record;
begin
  for active_room in
    select id from public.rooms where status in ('waiting', 'playing')
  loop
    perform public.enforce_single_pawn_for_room(active_room.id);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
