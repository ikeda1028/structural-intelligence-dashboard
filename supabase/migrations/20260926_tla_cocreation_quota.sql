-- New isolated objects only. Do not alter existing intelligence data or permissions.
begin;
create table if not exists public.tla_cocreation_quota (
  day date not null,
  bucket text not null,
  used integer not null default 0 check (used >= 0),
  primary key (day,bucket)
);
alter table public.tla_cocreation_quota enable row level security;
revoke all on table public.tla_cocreation_quota from public, anon, authenticated;
grant select,insert,update,delete on table public.tla_cocreation_quota to service_role;
create or replace function public.tla_cocreation_reserve(p_visitor text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  today date := (pg_catalog.now() at time zone 'UTC')::date;
  g integer;
  v integer;
begin
  if p_visitor is null or p_visitor !~ '^[a-f0-9]{64}$' then return false; end if;
  -- One lock covers both counters, including concurrent serverless instances.
  perform pg_catalog.pg_advisory_xact_lock(9262026,1741);
  delete from public.tla_cocreation_quota where day < today - 7;
  insert into public.tla_cocreation_quota(day,bucket,used) values(today,'global',0) on conflict do nothing;
  select used into g from public.tla_cocreation_quota where day=today and bucket='global';
  if g >= 30 then return false; end if;
  insert into public.tla_cocreation_quota(day,bucket,used) values(today,p_visitor,0) on conflict do nothing;
  select used into v from public.tla_cocreation_quota where day=today and bucket=p_visitor;
  if v >= 3 then return false; end if;
  update public.tla_cocreation_quota set used=used+1 where day=today and bucket in ('global',p_visitor);
  return true;
end;
$$;
revoke all on function public.tla_cocreation_reserve(text) from public, anon, authenticated;
grant execute on function public.tla_cocreation_reserve(text) to service_role;
commit;
