-- Adiciona campo de tempo de experiência individual por esporte no EID do usuário
alter table public.usuario_eid
  add column if not exists tempo_experiencia text;
