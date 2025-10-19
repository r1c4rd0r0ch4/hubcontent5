import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { MessageCircle, Search } from 'lucide-react';

interface Conversation {
  userId: string;
  username: string;
  avatar_url: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isActive: boolean;
}

interface ConversationListProps {
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
}

export function ConversationList({ selectedUserId, onSelectUser }: ConversationListProps) {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();

    // Subscribe to message changes
    const channel = supabase
      .channel('conversation_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const loadConversations = async () => {
    if (!profile) return;

    try {
      // Get all active subscriptions for the current user
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscriber:profiles!subscriptions_subscriber_id_fkey(id, username, avatar_url),
          influencer:profiles!subscriptions_influencer_id_fkey(id, username, avatar_url)
        `)
        .eq('status', 'active')
        .or(`subscriber_id.eq.${profile.id},influencer_id.eq.${profile.id}`);

      if (!subscriptions) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // For each subscription, get the last message and unread count
      const conversationsData = await Promise.all(
        subscriptions.map(async (sub: any) => {
          const otherUser =
            sub.subscriber_id === profile.id ? sub.influencer : sub.subscriber;

          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at')
            .or(
              `and(sender_id.eq.${profile.id},receiver_id.eq.${otherUser.id}),and(sender_id.eq.${otherUser.id},receiver_id.eq.${profile.id})`
            )
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get unread count
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('sender_id', otherUser.id)
            .eq('receiver_id', profile.id)
            .eq('is_read', false);

          return {
            userId: otherUser.id,
            username: otherUser.username,
            avatar_url: otherUser.avatar_url,
            lastMessage: lastMsg?.content || 'Nenhuma mensagem ainda',
            lastMessageTime: lastMsg?.created_at || sub.created_at,
            unreadCount: count || 0,
            isActive: true,
          };
        })
      );

      // Sort by last message time
      conversationsData.sort(
        (a, b) =>
          new Date(b.lastMessageTime).getTime() -
          new Date(a.lastMessageTime).getTime()
      );

      setConversations(conversationsData);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <MessageCircle className="w-12 h-12 mx-auto mb-2 animate-pulse" />
          <p>Carregando conversas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar conversas..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            {conversations.length === 0 ? (
              <>
                <p className="font-medium mb-2">Nenhuma conversa ainda</p>
                <p className="text-sm">
                  As conversas aparecem aqui quando você tem assinaturas ativas
                </p>
              </>
            ) : (
              <p>Nenhum resultado encontrado</p>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <button
              key={conv.userId}
              onClick={() => onSelectUser(conv.userId)}
              className={`w-full p-4 border-b hover:bg-gray-50 transition-colors text-left ${
                selectedUserId === conv.userId ? 'bg-pink-50 border-l-4 border-l-pink-600' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {conv.avatar_url ? (
                  <img
                    src={conv.avatar_url}
                    alt={conv.username}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                    <span className="text-white font-semibold text-xl">
                      {conv.username[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-gray-900 truncate">
                      @{conv.username}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="bg-pink-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(conv.lastMessageTime).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
