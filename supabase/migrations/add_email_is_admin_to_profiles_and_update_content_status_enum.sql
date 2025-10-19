/*
  # Adicionar email e is_admin à tabela profiles e atualizar o enum de status de content_posts
  1. Alterar Tabela: profiles (adicionar email text, adicionar is_admin boolean)
  2. Criar Tipo: content_post_status (enum com 'draft', 'pending_review', 'approved', 'rejected')
  3. Alterar Tabela: content_posts (alterar coluna status para usar o novo enum)
  4. Segurança: Adicionar políticas RLS para profiles para permitir que usuários autenticados leiam is_admin e email.
*/

-- Adicionar coluna 'email' à tabela profiles se não existir
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email text UNIQUE;

-- Adicionar coluna 'is_admin' à tabela profiles se não existir
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT FALSE;

-- Atualizar perfis existentes com email de auth.users se email for nulo
-- Este é um passo de migração de dados único.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='email') THEN
        UPDATE public.profiles
        SET email = auth.users.email
        FROM auth.users
        WHERE public.profiles.id = auth.users.id
          AND public.profiles.email IS NULL;
    END IF;
END;
$$;

-- Criar tipo enum content_post_status se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_post_status') THEN
        CREATE TYPE public.content_post_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected');
    END IF;
END
$$;

-- Alterar a coluna content_posts.status para usar o novo tipo enum
-- Primeiro, garantir que todos os valores 'status' existentes sejam válidos para o novo enum, ou fazer um cast.
-- Para simplicidade, assumimos que os valores existentes são 'approved' ou 'draft' e adicionamos 'pending_review', 'rejected'.
ALTER TABLE content_posts
ALTER COLUMN status TYPE public.content_post_status
USING status::text::public.content_post_status;

-- Adicionar 'pending_review' e 'rejected' ao enum se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'content_post_status'::regtype AND enumlabel = 'pending_review') THEN
        ALTER TYPE public.content_post_status ADD VALUE 'pending_review';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'content_post_status'::regtype AND enumlabel = 'rejected') THEN
        ALTER TYPE public.content_post_status ADD VALUE 'rejected';
    END IF;
END
$$;

-- RLS para profiles: Permitir que usuários autenticados leiam outros perfis para verificação de admin
-- Esta política é ampla, considere refinar se necessário. Para verificação de admin, está ok.
CREATE POLICY "Allow authenticated users to read other profiles for admin check"
ON profiles FOR SELECT TO authenticated
USING (true);