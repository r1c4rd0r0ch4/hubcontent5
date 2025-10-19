/*
  # Adicionar coluna is_influencer à tabela profiles
  1. Alterar Tabela: profiles (adicionar is_influencer boolean)
  2. Segurança: Nenhuma alteração de RLS necessária, pois a política de leitura existente já cobre.
*/

-- Adicionar coluna 'is_influencer' à tabela profiles se não existir
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_influencer boolean DEFAULT FALSE;

-- Opcional: Se você tiver perfis existentes que deveriam ser influenciadores,
-- você pode atualizá-los aqui. Por exemplo:
-- UPDATE public.profiles
-- SET is_influencer = TRUE
-- WHERE id IN ('ID_DO_SEU_INFLUENCIADOR_1', 'ID_DO_SEU_INFLUENCIADOR_2');

-- Para o ID que estamos depurando, podemos definir explicitamente:
-- UPDATE public.profiles
-- SET is_influencer = TRUE
-- WHERE id = '3bd2898d-c3e6-4276-aeda-6e93de73707d';