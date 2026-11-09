-- CobroYa · esquema para la fase con servidor (Supabase / PostgreSQL).
-- La app del MVP ya funciona sin servidor (datos en el teléfono). Este esquema replica el
-- modelo de datos de src/lib/types.ts para sincronizar y para que la página de pago pública
-- (cobroya.bo/p/CODIGO) lea el cobro y reciba el comprobante del cliente.
-- Montos en centavos (bigint). Cada negocio solo ve sus datos (Row Level Security).

create type plan_id as enum ('gratis','basico','pro');
create type canal as enum ('whatsapp','marketplace','tienda','otro');
create type medio_pago as enum ('qr','efectivo','transferencia');
create type origen_pago as enum ('cliente','comerciante');
create type estado_pago as enum ('por_confirmar','confirmado','rechazado');
create type tipo_recordatorio as enum ('antes','dia','vencido');

create table negocios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  rubro text not null default '',
  logo_path text,
  celular text not null,
  plan plan_id not null default 'gratis',
  plan_vence date,
  fecha_alta date not null default current_date,
  config_recordatorios jsonb not null default '{}'::jsonb
);

create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  negocio_id uuid not null references negocios(id) on delete cascade,
  celular text not null,
  nombre text not null default '',
  rol text not null default 'dueno' check (rol in ('dueno','ayudante'))
);

create table qrs (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  banco text not null,
  imagen_path text not null,
  tipo text not null default 'fijo' check (tipo in ('fijo','por_monto')),
  activo boolean not null default true,
  por_defecto boolean not null default false
);

create table clientes (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  celular text not null default '',
  notas text not null default '',
  creado timestamptz not null default now()
);

create table cobros (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  cliente_id uuid not null references clientes(id),
  concepto text not null,
  monto bigint not null check (monto > 0),
  canal canal not null,
  fecha_emision date not null default current_date,
  vencimiento date not null,
  enlace text not null unique,           -- código corto de cobroya.bo/p/CODIGO
  enlaces_anteriores text[] not null default '{}',
  anulado boolean not null default false,
  qr_id uuid references qrs(id),
  notas text not null default ''
);
create index on cobros (negocio_id, vencimiento);

create table cuotas (
  id uuid primary key default gen_random_uuid(),
  cobro_id uuid not null references cobros(id) on delete cascade,
  numero int not null,                    -- 0 = anticipo
  monto bigint not null,
  vencimiento date not null
);

create table pagos (
  id uuid primary key default gen_random_uuid(),
  cobro_id uuid not null references cobros(id) on delete restrict,
  monto bigint not null check (monto > 0),
  fecha date not null,
  medio medio_pago not null,
  comprobante_path text,
  nro_transaccion text,
  origen origen_pago not null,
  estado estado_pago not null,
  motivo_rechazo text,
  registrado timestamptz not null default now()
);
create index on pagos (cobro_id);

create table recordatorios (
  id uuid primary key default gen_random_uuid(),
  cobro_id uuid not null references cobros(id) on delete cascade,
  tipo tipo_recordatorio not null,
  fecha_programada date not null,
  fecha_envio timestamptz
);

-- ---------- Seguridad: cada negocio solo ve lo suyo ----------
create or replace function mi_negocio() returns uuid
language sql stable security definer set search_path = public as
$$ select negocio_id from usuarios where id = auth.uid() $$;

alter table negocios enable row level security;
alter table usuarios enable row level security;
alter table qrs enable row level security;
alter table clientes enable row level security;
alter table cobros enable row level security;
alter table cuotas enable row level security;
alter table pagos enable row level security;
alter table recordatorios enable row level security;

create policy propio on negocios for all using (id = mi_negocio()) with check (id = mi_negocio());
create policy propio on usuarios for all using (negocio_id = mi_negocio()) with check (negocio_id = mi_negocio());
create policy propio on qrs for all using (negocio_id = mi_negocio()) with check (negocio_id = mi_negocio());
create policy propio on clientes for all using (negocio_id = mi_negocio()) with check (negocio_id = mi_negocio());
create policy propio on cobros for all using (negocio_id = mi_negocio()) with check (negocio_id = mi_negocio());
create policy propio on cuotas for all
  using (exists (select 1 from cobros c where c.id = cobro_id and c.negocio_id = mi_negocio()))
  with check (exists (select 1 from cobros c where c.id = cobro_id and c.negocio_id = mi_negocio()));
create policy propio on pagos for all
  using (exists (select 1 from cobros c where c.id = cobro_id and c.negocio_id = mi_negocio()))
  with check (exists (select 1 from cobros c where c.id = cobro_id and c.negocio_id = mi_negocio()));
create policy propio on recordatorios for all
  using (exists (select 1 from cobros c where c.id = cobro_id and c.negocio_id = mi_negocio()))
  with check (exists (select 1 from cobros c where c.id = cobro_id and c.negocio_id = mi_negocio()));

-- ---------- Página de pago pública (sin registro del cliente) ----------
-- Devuelve solo lo que el cliente necesita ver; nunca otros cobros ni datos del negocio.
create or replace function pagina_pago(p_codigo text)
returns table (negocio text, logo_path text, concepto text, saldo bigint, vencimiento date,
               qr_path text, qr_tipo text, estado text, ultimo_rechazo text)
language sql stable security definer set search_path = public as $$
  select n.nombre, n.logo_path, c.concepto,
         greatest(0, c.monto - coalesce((select sum(p.monto) from pagos p where p.cobro_id = c.id and p.estado = 'confirmado'), 0)),
         c.vencimiento,
         coalesce(q.imagen_path, (select imagen_path from qrs where negocio_id = n.id and por_defecto limit 1)),
         coalesce(q.tipo, 'fijo'),
         case when c.anulado then 'anulado'
              when exists (select 1 from pagos p where p.cobro_id = c.id and p.estado = 'por_confirmar') then 'por_confirmar'
              else 'abierto' end,
         (select motivo_rechazo from pagos p where p.cobro_id = c.id and p.origen = 'cliente' and p.estado = 'rechazado' order by registrado desc limit 1)
  from cobros c join negocios n on n.id = c.negocio_id left join qrs q on q.id = c.qr_id
  where c.enlace = upper(p_codigo)
$$;

-- El cliente sube su comprobante: queda Por confirmar; nunca puede marcar Pagado.
create or replace function subir_comprobante(p_codigo text, p_monto bigint, p_comprobante_path text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_cobro uuid; v_id uuid;
begin
  select id into v_cobro from cobros where enlace = upper(p_codigo) and not anulado;
  if v_cobro is null then raise exception 'Enlace no válido'; end if;
  insert into pagos (cobro_id, monto, fecha, medio, comprobante_path, origen, estado)
  values (v_cobro, p_monto, current_date, 'qr', p_comprobante_path, 'cliente', 'por_confirmar')
  returning id into v_id;
  return v_id;
end $$;

grant execute on function pagina_pago(text) to anon;
grant execute on function subir_comprobante(text, bigint, text) to anon;
-- Almacenamiento: crear buckets privados "qrs", "logos" y "comprobantes" y servir las imágenes
-- de la página de pago con URLs firmadas generadas por una Edge Function.
