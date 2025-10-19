/*
  # Adicionar política RLS para SELECT em content_posts
  1. Segurança: Habilitar RLS e adicionar política para content_posts.
*/
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all users to read approved content posts" ON content_posts FOR SELECT USING (status = 'approved');