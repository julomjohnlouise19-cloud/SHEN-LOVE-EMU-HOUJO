-- After creating and confirming your email account, replace this example email.
-- Run in Supabase SQL Editor as the project owner. Never grant this operation to browser clients.
do $$
declare teacher_id uuid;
begin
  select id into teacher_id from auth.users where lower(email)=lower('teacher@example.com');
  if teacher_id is null then raise exception 'Create/confirm the teacher email account first, then replace the example email in this script.'; end if;
  insert into public.csl_teachers(user_id) values(teacher_id) on conflict(user_id) do nothing;
end $$;
