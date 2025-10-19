/*
  # Garantir a integridade do esquema e das políticas RLS
  1. Alterar Tabela: reported_content (adicionar coluna details TEXT IF NOT EXISTS)
  2. Segurança: Habilitar RLS e adicionar políticas para content_posts, content_likes, content_views, reported_content, subscriptions, payments, profiles.
*/

-- Adicionar coluna 'details' à tabela reported_content se ainda não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reported_content' AND column_name = 'details') THEN
        ALTER TABLE reported_content ADD COLUMN details TEXT;
    END IF;
END
$$;

-- Tabela content_posts
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read content posts" ON content_posts;
CREATE POLICY "Allow all users to read content posts" ON content_posts FOR SELECT USING (true);

-- Tabela content_likes
ALTER TABLE content_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own likes" ON content_likes;
CREATE POLICY "Allow authenticated users to insert their own likes" ON content_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Allow authenticated users to delete their own likes" ON content_likes;
CREATE POLICY "Allow authenticated users to delete their own likes" ON content_likes FOR DELETE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Allow all users to read content likes" ON content_likes;
CREATE POLICY "Allow all users to read content likes" ON content_likes FOR SELECT USING (true);

-- Tabela content_views
ALTER TABLE content_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own views" ON content_views;
CREATE POLICY "Allow authenticated users to insert their own views" ON content_views FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Allow all users to read content views" ON content_views;
CREATE POLICY "Allow all users to read content views" ON content_views FOR SELECT USING (true);

-- Tabela reported_content
ALTER TABLE reported_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to insert reports" ON reported_content;
CREATE POLICY "Allow authenticated users to insert reports" ON reported_content FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
DROP POLICY IF EXISTS "Allow admins to read all reports" ON reported_content;
CREATE POLICY "Allow admins to read all reports" ON reported_content FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
DROP POLICY IF EXISTS "Allow admins to update reports" ON reported_content;
CREATE POLICY "Allow admins to update reports" ON reported_content FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Tabela subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own subscriptions" ON subscriptions;
CREATE POLICY "Allow authenticated users to insert their own subscriptions" ON subscriptions FOR INSERT TO authenticated WITH CHECK (subscriber_id = auth.uid());
DROP POLICY IF EXISTS "Allow authenticated users to read their own subscriptions" ON subscriptions;
CREATE POLICY "Allow authenticated users to read their own subscriptions" ON subscriptions FOR SELECT TO authenticated USING (subscriber_id = auth.uid() OR influencer_id = auth.uid());
DROP POLICY IF EXISTS "Allow authenticated users to update their own subscriptions" ON subscriptions;
CREATE POLICY "Allow authenticated users to update their own subscriptions" ON subscriptions FOR UPDATE TO authenticated USING (subscriber_id = auth.uid());

-- Tabela payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own payments" ON payments;
CREATE POLICY "Allow authenticated users to insert their own payments" ON payments FOR INSERT TO authenticated WITH CHECK (subscriber_id = auth.uid());
DROP POLICY IF EXISTS "Allow authenticated users to read their own payments" ON payments;
CREATE POLICY "Allow authenticated users to read their own payments" ON payments FOR SELECT TO authenticated USING (subscriber_id = auth.uid() OR influencer_id = auth.uid());

-- Tabela profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON profiles;
CREATE POLICY "Allow authenticated users to read profiles" ON profiles FOR SELECT TO authenticated USING (true);