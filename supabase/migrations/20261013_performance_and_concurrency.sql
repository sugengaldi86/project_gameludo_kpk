-- Optimasi dashboard dan permainan untuk banyak room yang aktif bersamaan.
-- Jalankan setelah seluruh migration sampai 20261012.

create index if not exists game_sessions_room_id_idx on public.game_sessions(room_id);
create index if not exists room_players_room_id_idx on public.room_players(room_id);
create index if not exists room_players_player_id_idx on public.room_players(player_id);
create index if not exists game_pawns_session_idx on public.game_pawns(game_session_id);
create index if not exists game_turns_session_turn_idx on public.game_turns(game_session_id, turn_number desc);
create index if not exists player_answers_session_idx on public.player_answers(game_session_id);
create index if not exists player_answers_player_time_idx on public.player_answers(player_id, answered_at desc);
create index if not exists player_answers_question_idx on public.player_answers(question_id);
create index if not exists essay_answers_session_idx on public.player_essay_answers(game_session_id);
create index if not exists essay_answers_player_time_idx on public.player_essay_answers(player_id, answered_at desc);
create index if not exists guest_room_sessions_token_idx on public.guest_room_sessions(token_hash, expires_at);
create index if not exists questions_active_type_difficulty_idx on public.questions(is_active, question_type, difficulty);
create index if not exists learning_contents_order_idx on public.learning_contents(content_type, is_active, display_order);

create or replace function public.get_admin_dashboard_stats()
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'questions', (select count(*) from questions),
    'profiles', (select count(*) from profiles),
    'answers', (select count(*) from player_answers),
    'correctAnswers', (select count(*) from player_answers where is_correct is true),
    'informationCorrect', coalesce((select sum(identify_known_correct) from learning_progress), 0),
    'informationTotal', coalesce((select sum(identify_known_total) from learning_progress), 0),
    'strategyCorrect', coalesce((select sum(strategy_correct) from learning_progress), 0),
    'strategyTotal', coalesce((select sum(strategy_total) from learning_progress), 0),
    'kpkCorrect', coalesce((select sum(kpk_correct) from learning_progress), 0),
    'kpkTotal', coalesce((select sum(kpk_total) from learning_progress), 0),
    'verificationCorrect', coalesce((select sum(verification_correct) from learning_progress), 0),
    'verificationTotal', coalesce((select sum(verification_total) from learning_progress), 0)
  );
$$;

create or replace function public.get_game_state_fast(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_room rooms;
  v_session game_sessions;
  v_exam exams;
  v_turn game_turns;
  v_question questions;
  v_players jsonb;
  v_pawns jsonb;
  v_options jsonb := '[]'::jsonb;
  v_essay_count bigint;
  v_choice_count bigint;
begin
  select * into v_room from rooms where id=p_room_id;
  if not found then raise exception 'Room permainan tidak ditemukan'; end if;
  select * into v_session from game_sessions where room_id=p_room_id order by started_at desc limit 1;
  if not found then raise exception 'Sesi permainan tidak ditemukan'; end if;
  if v_room.status='playing' and v_room.end_time is not null and v_room.end_time<=now() then
    perform finalize_expired_game(p_room_id);
    select * into v_room from rooms where id=p_room_id;
    select * into v_session from game_sessions where room_id=p_room_id order by started_at desc limit 1;
  end if;
  if v_room.exam_id is not null then select * into v_exam from exams where id=v_room.exam_id; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'player_id',rp.player_id,'display_name',rp.display_name,'color',rp.color,'seat_number',rp.seat_number,
    'score',rp.score,'xp_earned',rp.xp_earned,'correct_answers',rp.correct_answers,
    'wrong_answers',rp.wrong_answers,'streak',rp.streak,
    'profiles',jsonb_build_object('level',p.level,'total_xp',p.total_xp,'total_score',p.total_score)
  ) order by rp.seat_number),'[]'::jsonb) into v_players
  from room_players rp left join profiles p on p.id=rp.player_id where rp.room_id=p_room_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'player_id',player_id,'pawn_number',pawn_number,'status',status,'position',position
  ) order by player_id,pawn_number),'[]'::jsonb) into v_pawns
  from game_pawns where game_session_id=v_session.id;

  select * into v_turn from game_turns
  where game_session_id=v_session.id and turn_number=v_session.current_turn_number and is_correct is null
  order by started_at desc limit 1;
  if v_turn.question_id is not null then
    select * into v_question from questions where id=v_turn.question_id;
    select coalesce(jsonb_agg(jsonb_build_object('key',option_key,'text',option_text) order by option_key),'[]'::jsonb)
      into v_options from question_options where question_id=v_question.id;
  end if;

  select count(*) into v_essay_count from player_essay_answers where game_session_id=v_session.id;
  select count(*) into v_choice_count from player_answers where game_session_id=v_session.id;

  return jsonb_build_object(
    'room',to_jsonb(v_room) || jsonb_build_object('exams',case when v_exam.id is null then null else to_jsonb(v_exam) end),
    'session',to_jsonb(v_session),'players',v_players,'pawns',v_pawns,
    'activeQuestion',case when v_question.id is null then null else jsonb_build_object(
      'id',v_question.id,'code',v_question.question_code,'content',v_question.story,
      'type',v_question.question_type,'options',v_options) end,
    'questionDeadlineAt',case when v_turn.started_at is not null and v_exam.question_time_seconds is not null
      then v_turn.started_at + make_interval(secs=>v_exam.question_time_seconds) else null end,
    'progress',jsonb_build_object('essay',v_essay_count,'multipleChoice',v_choice_count,'total',v_essay_count+v_choice_count),
    'targets',jsonb_build_object('essay',coalesce(v_exam.essay_question_count,5),'multipleChoice',coalesce(v_exam.multiple_choice_question_count,10))
  );
end; $$;

create or replace function public.submit_essay_game_turn(
  p_room_id uuid, p_question_id uuid, p_answer jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_session game_sessions;
  v_turn game_turns;
  v_exam exams;
  v_exam_id uuid;
  v_essay_count bigint;
  v_choice_count bigint;
  v_essay_target integer := 5;
  v_choice_target integer := 10;
  v_feedback text := 'end';
  v_complete boolean;
begin
  select * into v_session from game_sessions where room_id=p_room_id for update;
  if not found then raise exception 'Sesi permainan tidak ditemukan'; end if;
  if v_session.status <> 'QUIZ' then return jsonb_build_object('alreadyAnswered',true); end if;
  if v_session.current_player_id is null then raise exception 'Pemain aktif tidak ditemukan'; end if;

  select * into v_turn from game_turns
  where game_session_id=v_session.id and turn_number=v_session.current_turn_number for update;
  if not found or v_turn.question_id is distinct from p_question_id then raise exception 'Soal tidak lagi aktif'; end if;

  insert into player_essay_answers(
    game_session_id,turn_id,player_id,question_id,known_answer,asked_answer,plan_answer,
    solution_answer,check_answer,solution_method
  ) values (
    v_session.id,v_turn.id,v_session.current_player_id,p_question_id,
    trim(p_answer->>'known'),trim(p_answer->>'asked'),trim(p_answer->>'plan'),
    trim(p_answer->>'solution'),trim(p_answer->>'check'),p_answer->>'method'
  );
  update game_turns set finished_at=now() where id=v_turn.id;
  update game_sessions set status='TURN_END' where id=v_session.id;

  select exam_id into v_exam_id from rooms where id=p_room_id;
  if v_exam_id is not null then
    select * into v_exam from exams where id=v_exam_id;
    v_essay_target := coalesce(v_exam.essay_question_count,5);
    v_choice_target := coalesce(v_exam.multiple_choice_question_count,10);
    v_feedback := coalesce(v_exam.feedback_timing,'end');
  end if;
  select count(*) into v_essay_count from player_essay_answers where game_session_id=v_session.id;
  select count(*) into v_choice_count from player_answers where game_session_id=v_session.id;
  v_complete := v_essay_count>=v_essay_target and v_choice_count>=v_choice_target;
  if v_complete then perform finalize_completed_game(p_room_id); end if;

  return jsonb_build_object('saved',true,'gameComplete',v_complete,'showExplanation',v_feedback='immediate' or v_complete,
    'essayCount',v_essay_count,'choiceCount',v_choice_count,
    'targets',jsonb_build_object('essay',v_essay_target,'multipleChoice',v_choice_target));
end; $$;

revoke all on function public.get_admin_dashboard_stats() from public,anon,authenticated;
revoke all on function public.get_game_state_fast(uuid) from public,anon,authenticated;
revoke all on function public.submit_essay_game_turn(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.get_admin_dashboard_stats() to service_role;
grant execute on function public.get_game_state_fast(uuid) to service_role;
grant execute on function public.submit_essay_game_turn(uuid,uuid,jsonb) to service_role;

notify pgrst, 'reload schema';
