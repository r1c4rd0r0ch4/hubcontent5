import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database, Tables } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Export this type so it can be used in ReportedContentTab.tsx
export type ReportedContentWithDetails = Tables<'reported_content'> & {
  content_posts: Tables<'content_posts'> | null;
  reporter: Tables<'profiles'> | null;
  content_owner: Tables<'profiles'> | null; // The user who posted the content
};

interface AdminData {
  profiles: Profile[];
  reportedContent: ReportedContentWithDetails[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useAdminData = (): AdminData => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [reportedContent, setReportedContent] = useState<ReportedContentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Buscar perfis
      console.log('[useAdminData] Fetching all profiles...');
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('[useAdminData] Error fetching profiles:', profilesError);
        throw profilesError;
      }
      setProfiles(profilesData || []);
      console.log(`[useAdminData] Fetched ${profilesData.length} profiles.`);

      // 2. Buscar conteúdo reportado com joins aninhados
      console.log('[useAdminData] Fetching reported content...');
      const { data: reportedContentRaw, error: reportedContentError } = await supabase
        .from('reported_content')
        .select(
          `
          *,
          content_posts (
            id, title, description, thumbnail_url, user_id, status,
            profiles(id, full_name, email)
          ),
          reporter:profiles (
            id, full_name, email
          )
          `
        )
        .order('reported_at', { ascending: false });

      if (reportedContentError) {
        console.error('[useAdminData] Error fetching reported content:', reportedContentError);
        throw reportedContentError;
      }

      // Mapear os dados brutos para corresponder ao tipo ReportedContentWithDetails
      // Isso "achata" o content_owner que vem aninhado dentro de 'content_posts' para o nível superior
      const mappedReportedContent: ReportedContentWithDetails[] = (reportedContentRaw || []).map(report => {
        // Agora report.content_posts terá uma propriedade 'profiles'
        const contentOwner = report.content_posts?.profiles || null;
        // Cria um novo objeto de conteúdo sem o 'profiles' aninhado para o tipo de nível superior
        const contentPostsWithoutNestedProfiles = report.content_posts ? { ...report.content_posts, profiles: undefined } : null;

        return {
          ...report,
          content_posts: contentPostsWithoutNestedProfiles, // Atribui ao content_posts
          content_owner: contentOwner, // content_owner "achatado" para o nível superior
        };
      });

      setReportedContent(mappedReportedContent);
      console.log(`[useAdminData] Fetched ${mappedReportedContent.length} reported content items.`);

    } catch (err: any) {
      console.error('[useAdminData] General error in fetchAdminData:', err);
      setError(err.message || 'Falha ao carregar dados do administrador.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  return { profiles, reportedContent, loading, error, refetch: fetchAdminData };
};
