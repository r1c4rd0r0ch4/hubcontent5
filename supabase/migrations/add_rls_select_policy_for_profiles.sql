/*
  # Adicionar política RLS SELECT para a tabela profiles
  1. Segurança: Adicionar política para permitir que usuários autenticados leiam perfis.
*/
CREATE POLICY "Allow authenticated users to read profiles" ON profiles FOR SELECT TO authenticated USING (true);