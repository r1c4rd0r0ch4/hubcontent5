import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Send, Search } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    username: string;
    avatar_url: string | null;
  };
  receiver?: {
    username: string;
    avatar_url: string | null;
  };
}

interface Conversation {
  userId: string;
  username: string;
  avatar_url: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export function UserMessages() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();

    const channel = supabase
      .channel('user_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadConversations();
        if (selectedUser) {
          loadMessages(selectedUser);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  useEffect(() => {
    if (selectedUser) {
      loadMessages(selectedUser);
    }
  }, [selectedUser]);

  const loadConversations = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (username, avatar_url),
        receiver:receiver_id (username, avatar_url)
      `)
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const convMap = new Map<string, Conversation>();

      data.forEach((msg: any) => {
        const otherUserId = msg.sender_id === profile.id ? msg.receiver_id : msg.sender_id;
        const otherUser = msg.sender_id === profile.id ? msg.receiver : msg.sender;

        if (!convMap.has(otherUserId)) {
          convMap.set(otherUserId, {
            userId: otherUserId,
            username: otherUser.username,
            avatar_url: otherUser.avatar_url,
            lastMessage: msg.content,
            lastMessageTime: msg.created_at,
            unreadCount: 0,
          });
        }

        if (msg.receiver_id === profile.id && !msg.is_read) {
          const conv = convMap.get(otherUserId)!;
          conv.unreadCount++;
        }
      });

      setConversations(Array.from(convMap.values()));
    }
    setLoading(false);
  };

  const loadMessages = async (userId: string) => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (username, avatar_url),
        receiver:receiver_id (username, avatar_url)
      `)
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${profile.id})`)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as any);

      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', profile.id)
        .eq('sender_id', userId);

      loadConversations();
    }
  };

  const sendMessage = async () => {
    if (!profile || !selectedUser || !newMessage.trim()) return;

    const { error } = await supabase.from('messages').insert({
      sender_id: profile.id,
      receiver_id: selectedUser,
      content: newMessage.trim(),
    });

    if (!error) {
      setNewMessage('');
      loadMessages(selectedUser);
      loadConversations();
    }
  };

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Mensagens</h2>

      {conversations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma conversa ainda</h3>
          <p className="text-gray-600">Assine um influencer e comece a conversar</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden" style={{ height: '650px' }}>
          <div className="grid grid-cols-3 h-full">
            <div className="col-span-1 border-r flex flex-col overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar conversas..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.userId}
                    onClick={() => setSelectedUser(conv.userId)}
                    className={`w-full p-4 border-b hover:bg-gray-50 transition-colors text-left ${
                      selectedUser === conv.userId ? 'bg-pink-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {conv.avatar_url ? (
                        <img
                          src={conv.avatar_url}
                          alt={conv.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
                          <span className="text-pink-600 font-semibold">
                            {conv.username[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900 truncate">@{conv.username}</p>
                          {conv.unreadCount > 0 && (
                            <span className="bg-pink-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(conv.lastMessageTime).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-2 flex flex-col">
              {selectedUser ? (
                <>
                  <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center gap-3">
                      {conversations.find(c => c.userId === selectedUser)?.avatar_url ? (
                        <img
                          src={conversations.find(c => c.userId === selectedUser)?.avatar_url!}
                          alt="Avatar"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                          <span className="text-pink-600 font-semibold">
                            {conversations.find(c => c.userId === selectedUser)?.username[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">
                          @{conversations.find(c => c.userId === selectedUser)?.username}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" style={{ minHeight: 0 }}>
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <p>Nenhuma mensagem ainda. Comece a conversar!</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_id === profile?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-sm ${
                              msg.sender_id === profile?.id
                                ? 'bg-pink-600 text-white'
                                : 'bg-white text-gray-900 border border-gray-200'
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-xs mt-1 ${
                              msg.sender_id === profile?.id ? 'text-pink-100' : 'text-gray-500'
                            }`}>
                              {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>Selecione uma conversa para começar</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
