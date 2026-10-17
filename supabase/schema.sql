-- =========================================================
-- Mi biblioteca · esquema de Supabase
-- Ejecutar una vez en: Supabase → SQL Editor → New query → Run
-- =========================================================

-- Un registro por libro y usuario. El libro completo va en «data» (jsonb),
-- así la app puede añadir campos sin cambiar la tabla.
create table if not exists public.libros (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,                      -- id del libro en la app (p. ej. «b1790489310497»)
  data       jsonb       not null default '{}'::jsonb,  -- título, autor/a, notas, estado, premios, país…
  deleted    boolean     not null default false,        -- borrado lógico, para que el borrado llegue a todos los dispositivos
  modified   bigint      not null,                      -- hora (ms) de la última modificación en el cliente: gana la más reciente
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Acceso desde la app solo para usuarios con sesión (necesario si el proyecto
-- no expone automáticamente las tablas nuevas); los invitados no tocan la nube
revoke all on public.libros from anon;
grant select, insert, update, delete on public.libros to authenticated;

-- Seguridad por filas: cada usuario solo ve y modifica sus propios libros
alter table public.libros enable row level security;

drop policy if exists "libros: leer los propios"      on public.libros;
drop policy if exists "libros: crear los propios"     on public.libros;
drop policy if exists "libros: modificar los propios" on public.libros;
drop policy if exists "libros: borrar los propios"    on public.libros;

create policy "libros: leer los propios"      on public.libros for select using (auth.uid() = user_id);
create policy "libros: crear los propios"     on public.libros for insert with check (auth.uid() = user_id);
create policy "libros: modificar los propios" on public.libros for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "libros: borrar los propios"    on public.libros for delete using (auth.uid() = user_id);

-- updated_at automático en cada cambio
create or replace function public.libros_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists libros_touch on public.libros;
create trigger libros_touch before update on public.libros
  for each row execute function public.libros_touch();

-- Mantener activo: el plan gratuito pausa el proyecto tras 7 días sin uso.
-- .github/workflows/keepalive.yml llama a esta función cada 3 días. No lee ni devuelve libros.
create or replace function public.keepalive() returns timestamptz
language sql stable set search_path = '' as $$ select now() $$;

revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;

-- Tiempo real: los cambios llegan al instante a los demás dispositivos abiertos
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'libros') then
    alter publication supabase_realtime add table public.libros;
  end if;
end $$;
