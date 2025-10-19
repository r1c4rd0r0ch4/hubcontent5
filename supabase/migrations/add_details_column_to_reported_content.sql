/*
  # Adicionar coluna 'details' à tabela reported_content
  1. Alterar Tabela: reported_content (adicionar coluna details TEXT)
*/
ALTER TABLE reported_content
ADD COLUMN details TEXT;

-- A coluna 'details' já é opcional no frontend, então não precisamos de um ALTER COLUMN para DROP NOT NULL,
-- pois o padrão para TEXT é aceitar NULL.