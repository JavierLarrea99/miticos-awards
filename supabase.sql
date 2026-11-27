-- =====================================================================
--  MÍTICOS AWARDS 2026 · base de datos (pegar entero en Supabase → SQL Editor → Run)
-- =====================================================================

-- 1) Quién puede votar (pon aquí los correos de tu grupo)
create table if not exists public.votantes (
  email     text primary key check (email = lower(email)),
  nombre    text not null,
  es_admin  boolean not null default false
);

-- 2) Ajustes de la gala (una sola fila)
create table if not exists public.ajustes (
  id                   int primary key default 1 check (id = 1),
  votacion_abierta     boolean not null default true,
  resultados_publicos  boolean not null default false,   -- true = se ven todos los resultados
  categorias_reveladas text[]  not null default '{}'      -- o se revelan una a una (modo gala)
);
insert into public.ajustes (id) values (1) on conflict do nothing;

-- 3) Los votos: un top 5 por persona y categoría (se puede cambiar mientras esté abierta)
create table if not exists public.votos (
  email       text not null references public.votantes(email) on delete cascade,
  categoria   text not null,
  ranking     text[] not null check (array_length(ranking, 1) between 1 and 5),
  actualizado timestamptz not null default now(),
  primary key (email, categoria)
);

-- ---------------------------------------------------------------------
--  Funciones de ayuda
-- ---------------------------------------------------------------------
create or replace function public.mi_email() returns text
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.es_votante() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from votantes where email = mi_email())
$$;

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from votantes where email = mi_email() and es_admin)
$$;

-- ¿Este correo está en la lista? (para avisar antes de mandar el email)
create or replace function public.puede_entrar(correo text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from votantes where email = lower(trim(correo)))
$$;
grant execute on function public.puede_entrar(text) to anon, authenticated;

-- ---------------------------------------------------------------------
--  Seguridad (RLS)
-- ---------------------------------------------------------------------
alter table public.votantes enable row level security;
alter table public.ajustes  enable row level security;
alter table public.votos    enable row level security;

drop policy if exists "ver mi ficha" on public.votantes;
create policy "ver mi ficha" on public.votantes for select to authenticated
  using (email = mi_email() or es_admin());

drop policy if exists "leer ajustes" on public.ajustes;
create policy "leer ajustes" on public.ajustes for select to anon, authenticated using (true);
drop policy if exists "admin cambia ajustes" on public.ajustes;
create policy "admin cambia ajustes" on public.ajustes for update to authenticated
  using (es_admin()) with check (es_admin());

drop policy if exists "ver mis votos" on public.votos;
create policy "ver mis votos" on public.votos for select to authenticated
  using (email = mi_email());
drop policy if exists "votar" on public.votos;
create policy "votar" on public.votos for insert to authenticated
  with check (email = mi_email() and es_votante()
              and (select votacion_abierta from ajustes where id = 1));
drop policy if exists "cambiar voto" on public.votos;
create policy "cambiar voto" on public.votos for update to authenticated
  using (email = mi_email())
  with check (email = mi_email() and (select votacion_abierta from ajustes where id = 1));
drop policy if exists "borrar voto" on public.votos;
create policy "borrar voto" on public.votos for delete to authenticated
  using (email = mi_email() and (select votacion_abierta from ajustes where id = 1));

-- ---------------------------------------------------------------------
--  Resultados: 1º = 10 pts, 2º = 7, 3º = 5, 4º = 3, 5º = 1
--  Solo devuelve categorías reveladas (o todas si resultados_publicos / eres admin)
-- ---------------------------------------------------------------------
create or replace function public.resultados()
returns table (categoria text, nominado text, puntos int, primeros int, votantes int)
language sql stable security definer set search_path = public as $$
  with aj as (select * from ajustes where id = 1),
  puntos as (
    select v.categoria, r.nominado,
           case r.pos when 1 then 10 when 2 then 7 when 3 then 5 when 4 then 3 when 5 then 1 else 0 end as pts,
           (r.pos = 1)::int as es_primero, v.email
    from votos v, unnest(v.ranking) with ordinality as r(nominado, pos)
  )
  select p.categoria, p.nominado, sum(p.pts)::int, sum(p.es_primero)::int, count(distinct p.email)::int
  from puntos p, aj
  where aj.resultados_publicos or es_admin() or p.categoria = any (aj.categorias_reveladas)
  group by p.categoria, p.nominado
  order by p.categoria, 3 desc, 4 desc
$$;
grant execute on function public.resultados() to anon, authenticated;

-- Participación (cuántos han votado cada categoría; sin decir qué han votado)
create or replace function public.participacion()
returns table (categoria text, votos int, total_votantes int)
language sql stable security definer set search_path = public as $$
  select c.categoria, count(v.email)::int, (select count(*) from votantes)::int
  from (select distinct categoria from votos) c
  left join votos v on v.categoria = c.categoria
  group by c.categoria
$$;
grant execute on function public.participacion() to authenticated;

-- Para el admin: quién ha votado cuántas categorías (no qué)
create or replace function public.quien_ha_votado()
returns table (nombre text, email text, categorias int)
language sql stable security definer set search_path = public as $$
  select t.nombre, t.email, count(v.categoria)::int
  from votantes t left join votos v on v.email = t.email
  where es_admin()
  group by t.nombre, t.email
  order by 3 desc, 1
$$;
grant execute on function public.quien_ha_votado() to authenticated;

-- Permisos de las tablas para la API (RLS sigue decidiendo qué filas)
grant usage on schema public to anon, authenticated;
grant select on public.ajustes to anon, authenticated;
grant update on public.ajustes to authenticated;
grant select on public.votantes to authenticated;
grant select, insert, update, delete on public.votos to authenticated;

-- Admin: añadir o quitar votantes desde la web
create or replace function public.guardar_votante(correo text, nombre_v text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'Solo el admin'; end if;
  insert into public.votantes (email, nombre) values (lower(trim(correo)), trim(nombre_v))
  on conflict (email) do update set nombre = excluded.nombre;
end $$;
create or replace function public.quitar_votante(correo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'Solo el admin'; end if;
  if lower(correo) = public.mi_email() then raise exception 'No puedes quitarte a ti mismo'; end if;
  delete from public.votos where email = lower(correo);
  delete from public.votantes where email = lower(correo);
end $$;
revoke execute on function public.guardar_votante(text, text) from public, anon;
revoke execute on function public.quitar_votante(text) from public, anon;
grant execute on function public.guardar_votante(text, text) to authenticated;
grant execute on function public.quitar_votante(text) to authenticated;

-- =====================================================================
--  TU GRUPO: cambia los nombres y correos (en minúsculas). Tú, con es_admin = true
-- =====================================================================
insert into public.votantes (email, nombre, es_admin) values
  ('tu_correo@gmail.com', 'Fitxi', true),
  ('amigo1@gmail.com',    'Amigo 1', false),
  ('amigo2@gmail.com',    'Amigo 2', false)
on conflict (email) do update set nombre = excluded.nombre, es_admin = excluded.es_admin;
