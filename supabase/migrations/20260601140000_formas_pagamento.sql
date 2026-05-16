-- Adiciona coluna de formas de pagamento aceitas ao espaço.
-- Valores válidos: 'pix', 'cartao', 'boleto'.
-- Por padrão todos os métodos ficam habilitados.

ALTER TABLE espacos_genericos
  ADD COLUMN IF NOT EXISTS formas_pagamento_aceitas text[]
    NOT NULL DEFAULT ARRAY['pix', 'cartao', 'boleto'];

ALTER TABLE espacos_genericos
  ADD CONSTRAINT eg_formas_pagamento_ck
    CHECK (
      formas_pagamento_aceitas <@ ARRAY['pix', 'cartao', 'boleto']::text[]
      AND cardinality(formas_pagamento_aceitas) >= 1
    );
