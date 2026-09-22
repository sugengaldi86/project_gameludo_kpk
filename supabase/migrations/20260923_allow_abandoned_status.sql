-- Memperluas state machine agar game lokal dapat diakhiri tanpa pemenang.
-- Constraint lama pada sebagian project Supabase belum menerima status abandoned.

alter table public.rooms
  drop constraint if exists rooms_status_check;

alter table public.rooms
  add constraint rooms_status_check
  check (status in ('waiting', 'playing', 'finished', 'abandoned'));

alter table public.game_sessions
  drop constraint if exists game_sessions_status_check;

alter table public.game_sessions
  add constraint game_sessions_status_check
  check (status in (
    'TURN_START',
    'ROLLING_DICE',
    'DICE_RESULT',
    'QUIZ',
    'FEEDBACK',
    'PAWN_SELECTION',
    'PAWN_MOVING',
    'BONUS_CHECK',
    'TURN_END',
    'GAME_OVER',
    'ABANDONED'
  ));

