-- Migração: remove modo "mista" e adiciona configuração de entrada de membros
-- Espaços existentes com modo_reserva = 'mista' passam para 'mista_pendente_escolha'
-- para que o dono seja forçado a escolher entre 'paga' e 'gratuita' no painel.

-- 1. Atualizar registros 'mista' para estado transitório
UPDATE espacos_genericos
  SET modo_reserva = 'mista_pendente_escolha'
  WHERE modo_reserva = 'mista';

-- 2. Atualizar constraint para aceitar novo estado transitório (sem mais 'mista' puro)
ALTER TABLE espacos_genericos DROP CONSTRAINT IF EXISTS eg_modo_reserva_ck;
ALTER TABLE espacos_genericos
  ADD CONSTRAINT eg_modo_reserva_ck
  CHECK (modo_reserva IN ('gratuita', 'paga', 'mista_pendente_escolha'));

-- 3. Atualizar constraint de monetizacao (remover 'misto')
ALTER TABLE espacos_genericos DROP CONSTRAINT IF EXISTS eg_modo_monetizacao_ck;
ALTER TABLE espacos_genericos
  ADD CONSTRAINT eg_modo_monetizacao_ck
  CHECK (modo_monetizacao IN ('mensalidade_plataforma', 'apenas_reservas', 'misto'));
-- Nota: mantemos 'misto' na constraint de monetização temporariamente para não
-- quebrar registros existentes. Limpeza futura após UI atualizada.

-- 4. Adicionar coluna de modo de entrada de membros no espaço gratuito
ALTER TABLE espacos_genericos
  ADD COLUMN IF NOT EXISTS entrada_membro_modo text NOT NULL DEFAULT 'manual'
  CHECK (entrada_membro_modo IN ('automatica', 'manual'));

-- 5. Adicionar coluna de texto de boas-vindas para drawer de entrada de membro
ALTER TABLE espacos_genericos
  ADD COLUMN IF NOT EXISTS entrada_membro_descricao text;
