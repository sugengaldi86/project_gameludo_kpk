-- Fix: tambahkan GRANT EXECUTE untuk function finalize_expired_game
-- Function ini dibuat di 20260925_game_integrity_fixes.sql dengan SECURITY DEFINER
-- tetapi tidak memiliki GRANT EXECUTE ke service_role, menyebabkan error
-- "permission denied for function finalize_expired_game".

-- Revoke execute dari PUBLIC dulu (best practice untuk security definer functions)
revoke execute on function public.finalize_expired_game(uuid) from public;

-- Berikan akses hanya ke service_role (digunakan oleh Next.js API routes melalui supabaseServer())
grant execute on function public.finalize_expired_game(uuid) to service_role;
