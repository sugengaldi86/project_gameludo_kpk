-- Menutup race condition timer dan menambahkan identitas siswa yang stabil.

alter table public.profiles
add column if not exists student_code text;

create unique index if not exists profiles_student_code_unique
on public.profiles (student_code)
where student_code is not null;

-- Guard ini berjalan di dalam transaksi RPC. Jika deadline terlewati,
-- exception membatalkan seluruh perubahan move_game_pawn/answer_game_turn.
create or replace function public.reject_game_mutation_after_deadline()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_room_id uuid;
  v_end_time timestamptz;
  v_room_status text;
begin
  if tg_table_name = 'game_pawns' then
    select gs.room_id into v_room_id
    from game_sessions gs
    where gs.id = new.game_session_id;
  elsif tg_table_name = 'player_answers' then
    select gs.room_id into v_room_id
    from game_sessions gs
    where gs.id = new.game_session_id;
  else
    raise exception 'Tabel mutasi permainan tidak didukung';
  end if;

  select r.end_time, r.status
  into v_end_time, v_room_status
  from rooms r
  where r.id = v_room_id;

  if not found then
    raise exception 'Room permainan tidak ditemukan';
  end if;
  if v_room_status <> 'playing' then
    raise exception 'Permainan sudah tidak aktif';
  end if;
  if v_end_time is not null and v_end_time <= now() then
    raise exception 'Waktu permainan telah habis';
  end if;

  return new;
end;
$$;

drop trigger if exists game_pawns_deadline_guard on public.game_pawns;
create trigger game_pawns_deadline_guard
before update on public.game_pawns
for each row execute function public.reject_game_mutation_after_deadline();

drop trigger if exists player_answers_deadline_guard on public.player_answers;
create trigger player_answers_deadline_guard
before insert on public.player_answers
for each row execute function public.reject_game_mutation_after_deadline();

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
  v_student_code text;
  v_index integer := 0;
begin
  if jsonb_typeof(p_players) <> 'array' or jsonb_array_length(p_players) not between 2 and 4 then
    raise exception 'Jumlah pemain harus 2 sampai 4';
  end if;

  if exists (
    select 1
    from (
      select upper(trim(value->>'studentCode')) as student_code
      from jsonb_array_elements(p_players)
    ) codes
    group by student_code
    having student_code is null or student_code = '' or count(*) > 1
  ) then
    raise exception 'Kode siswa wajib diisi dan harus berbeda untuk setiap pemain';
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
      -- Buat kode room baru jika terjadi benturan.
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

    v_student_code := upper(trim(v_player->>'studentCode'));
    if v_student_code !~ '^[A-Z0-9_-]{3,30}$' then
      raise exception 'Kode siswa harus 3-30 karakter berupa huruf, angka, garis bawah, atau tanda hubung';
    end if;

    insert into profiles (student_code, name, avatar)
    values (
      v_student_code,
      trim(v_player->>'name'),
      left(coalesce(v_player->>'avatar', v_player->>'name'), 1)
    )
    on conflict (student_code) where student_code is not null
    do update set
      name = excluded.name,
      avatar = excluded.avatar
    returning * into v_profile;

    insert into room_players (room_id, player_id, display_name, color, seat_number, is_ready, is_online)
    values (v_room.id, v_profile.id, v_profile.name, v_player->>'color', v_index + 1, true, true);

    v_players := v_players || jsonb_build_array(jsonb_build_object(
      'id', v_profile.id,
      'studentCode', v_profile.student_code,
      'name', v_profile.name,
      'avatar', v_profile.avatar,
      'color', v_player->>'color',
      'token', encode(gen_random_bytes(32), 'hex')
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
    'roomCode', v_code,
    'roomId', v_room.id,
    'sessionId', v_session.id,
    'accessToken', v_token,
    'players', v_players
  );
end;
$$;
