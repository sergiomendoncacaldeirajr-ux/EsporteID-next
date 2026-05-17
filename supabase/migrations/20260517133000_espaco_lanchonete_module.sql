alter table public.espaco_staff
  add column if not exists permissoes_json jsonb not null default jsonb_build_object(
    'agenda', jsonb_build_object('ver', true),
    'reservas', jsonb_build_object('conferir', true),
    'pagamentos', jsonb_build_object('ver', true),
    'lanchonete', jsonb_build_object('ver', false, 'vender', false, 'estoque', false),
    'configuracao', jsonb_build_object('editar', false)
  );

create table if not exists public.espaco_produtos (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  nome text not null,
  descricao text,
  categoria text not null default 'geral',
  preco_centavos int not null default 0,
  foto_url text,
  ativo boolean not null default true,
  controla_estoque boolean not null default true,
  estoque_atual int not null default 0,
  estoque_minimo int not null default 0,
  ordem int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.espaco_pedidos (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  usuario_id uuid references public.profiles (id) on delete set null,
  espaco_staff_id bigint references public.espaco_staff (id) on delete set null,
  status text not null default 'pendente',
  payment_status text not null default 'pending',
  origem text not null default 'publico',
  valor_total_centavos int not null default 0,
  observacoes text,
  asaas_payment_id text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint espaco_pedidos_status_ck check (status in ('pendente', 'preparando', 'pronto', 'entregue', 'cancelado')),
  constraint espaco_pedidos_payment_status_ck check (payment_status in ('pending', 'processing', 'received', 'overdue', 'refunded', 'cancelled', 'isento')),
  constraint espaco_pedidos_origem_ck check (origem in ('publico', 'balcao', 'interno'))
);

create table if not exists public.espaco_pedido_itens (
  id bigint generated always as identity primary key,
  espaco_pedido_id bigint not null references public.espaco_pedidos (id) on delete cascade,
  espaco_produto_id bigint not null references public.espaco_produtos (id) on delete restrict,
  quantidade int not null default 1,
  preco_unitario_centavos int not null default 0,
  subtotal_centavos int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.espaco_estoque_movimentos (
  id bigint generated always as identity primary key,
  espaco_produto_id bigint not null references public.espaco_produtos (id) on delete cascade,
  espaco_pedido_id bigint references public.espaco_pedidos (id) on delete set null,
  tipo text not null,
  quantidade int not null,
  observacoes text,
  responsavel_usuario_id uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint espaco_estoque_movimentos_tipo_ck check (tipo in ('entrada', 'baixa_manual', 'venda', 'estorno', 'ajuste'))
);

create index if not exists idx_espaco_produtos_lookup
  on public.espaco_produtos (espaco_generico_id, ativo, categoria, ordem);

create index if not exists idx_espaco_pedidos_lookup
  on public.espaco_pedidos (espaco_generico_id, status, payment_status, criado_em desc);

create index if not exists idx_espaco_pedido_itens_lookup
  on public.espaco_pedido_itens (espaco_pedido_id, espaco_produto_id);

create index if not exists idx_espaco_estoque_movimentos_lookup
  on public.espaco_estoque_movimentos (espaco_produto_id, tipo, criado_em desc);

alter table public.espaco_produtos enable row level security;
alter table public.espaco_pedidos enable row level security;
alter table public.espaco_pedido_itens enable row level security;
alter table public.espaco_estoque_movimentos enable row level security;

drop policy if exists "espaco_produtos_read" on public.espaco_produtos;
create policy "espaco_produtos_read"
  on public.espaco_produtos for select to authenticated
  using (true);

drop policy if exists "espaco_produtos_manage_owner" on public.espaco_produtos;
create policy "espaco_produtos_manage_owner"
  on public.espaco_produtos for all to authenticated
  using (can_manage_espaco(espaco_generico_id, auth.uid()))
  with check (can_manage_espaco(espaco_generico_id, auth.uid()));

drop policy if exists "espaco_pedidos_read" on public.espaco_pedidos;
create policy "espaco_pedidos_read"
  on public.espaco_pedidos for select to authenticated
  using (
    can_manage_espaco(espaco_generico_id, auth.uid())
    or usuario_id = auth.uid()
  );

drop policy if exists "espaco_pedidos_manage_owner" on public.espaco_pedidos;
create policy "espaco_pedidos_manage_owner"
  on public.espaco_pedidos for all to authenticated
  using (can_manage_espaco(espaco_generico_id, auth.uid()))
  with check (can_manage_espaco(espaco_generico_id, auth.uid()));

drop policy if exists "espaco_pedido_itens_read" on public.espaco_pedido_itens;
create policy "espaco_pedido_itens_read"
  on public.espaco_pedido_itens for select to authenticated
  using (
    exists (
      select 1
      from public.espaco_pedidos p
      where p.id = espaco_pedido_id
        and (can_manage_espaco(p.espaco_generico_id, auth.uid()) or p.usuario_id = auth.uid())
    )
  );

drop policy if exists "espaco_pedido_itens_manage_owner" on public.espaco_pedido_itens;
create policy "espaco_pedido_itens_manage_owner"
  on public.espaco_pedido_itens for all to authenticated
  using (
    exists (
      select 1
      from public.espaco_pedidos p
      where p.id = espaco_pedido_id
        and can_manage_espaco(p.espaco_generico_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.espaco_pedidos p
      where p.id = espaco_pedido_id
        and can_manage_espaco(p.espaco_generico_id, auth.uid())
    )
  );

drop policy if exists "espaco_estoque_movimentos_read" on public.espaco_estoque_movimentos;
create policy "espaco_estoque_movimentos_read"
  on public.espaco_estoque_movimentos for select to authenticated
  using (
    exists (
      select 1
      from public.espaco_produtos pr
      where pr.id = espaco_produto_id
        and can_manage_espaco(pr.espaco_generico_id, auth.uid())
    )
  );

drop policy if exists "espaco_estoque_movimentos_manage_owner" on public.espaco_estoque_movimentos;
create policy "espaco_estoque_movimentos_manage_owner"
  on public.espaco_estoque_movimentos for all to authenticated
  using (
    exists (
      select 1
      from public.espaco_produtos pr
      where pr.id = espaco_produto_id
        and can_manage_espaco(pr.espaco_generico_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.espaco_produtos pr
      where pr.id = espaco_produto_id
        and can_manage_espaco(pr.espaco_generico_id, auth.uid())
    )
  );

drop trigger if exists tr_espaco_produtos_touch_updated_at on public.espaco_produtos;
create trigger tr_espaco_produtos_touch_updated_at
before update on public.espaco_produtos
for each row execute function public.espaco_touch_updated_at();

drop trigger if exists tr_espaco_pedidos_touch_updated_at on public.espaco_pedidos;
create trigger tr_espaco_pedidos_touch_updated_at
before update on public.espaco_pedidos
for each row execute function public.espaco_touch_updated_at();

drop trigger if exists tr_espaco_pedido_itens_touch_updated_at on public.espaco_pedido_itens;
create trigger tr_espaco_pedido_itens_touch_updated_at
before update on public.espaco_pedido_itens
for each row execute function public.espaco_touch_updated_at();

drop trigger if exists tr_espaco_estoque_movimentos_touch_updated_at on public.espaco_estoque_movimentos;
create trigger tr_espaco_estoque_movimentos_touch_updated_at
before update on public.espaco_estoque_movimentos
for each row execute function public.espaco_touch_updated_at();
