import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Send, User, Loader2, MessageSquare } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Conversation = Database['public']['Tables']['conversations']['Row'] & {
  participant1_profiles: Database['public']['Tables']['profiles']['Row'];
  participant2_profiles: Database['public']['Tables']['profiles']['Row'];
  last_message_content?: string; // To show a snippet
};
type Message = Database['public']['Tables']['messages']['Row'];

export function Messages() {
  const { profile: currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = useCallback(async () => {
    if (!currentUser) return;
    setLoadingConversations(true);

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant1_profiles:participant1_id (id, username, full_name, avatar_url),
        participant2_profiles:participant2_id (id, username, full_name, avatar_url)
      `)
      .or(`participant1_id.eq.${currentUser.id},participant2_id.eq.${currentUser.id}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
    } else {
      const conversationsWithLastMessage = await Promise.all(data.map(async (conv) => {
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('content')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return { ...conv, last_message_content: lastMessage?.content || 'Nenhuma mensagem.' };
      }));
      setConversations(conversationsWithLastMessage as Conversation[]);
    }
    setLoadingConversations(false);
  }, [currentUser]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }
    setLoadingMessages(false);
  }, []);

  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel('messages_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as Message;
          if (selectedConversation && newMessage.conversation_id === selectedConversation.id) {
            setMessages((prev) => [...prev, newMessage]);
            scrollToBottom();
          }
          // Also update conversations list for last message snippet
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages((prev) =>
            prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        () => {
          fetchConversations(); // Fetch new conversations
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, selectedConversation, fetchConversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !selectedConversation) return;

    const receiverId = selectedConversation.participant1_id === currentUser.id
      ? selectedConversation.participant2_id
      : selectedConversation.participant1_id;

    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConversation.id,
      sender_id: currentUser.id,
      receiver_id: receiverId, // Explicitly set receiver_id
      content: newMessage.trim(),
    });

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage('');
    }
  };

  const getParticipant = (conversation: Conversation) => {
    return conversation.participant1_id === currentUser?.id
      ? conversation.participant2_profiles
      : conversation.participant1_profiles;
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center py-12 text-text">
        <p>Por favor, faça login para acessar suas mensagens.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-100px)] bg-surface rounded-2xl shadow-xl border border-border overflow-hidden">
      {/* Conversation List */}
      <div className="w-1/3 border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-text">Mensagens</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="flex items-center justify-center p-4 text-primary">
              <Loader2 className="animate-spin mr-2" size={20} /> Carregando conversas...
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center p-4 text-textSecondary">
              <MessageSquare className="w-10 h-10 mx-auto mb-2" />
              <p>Nenhuma conversa ainda.</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const participant = getParticipant(conv);
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`flex items-center gap-3 p-4 w-full text-left border-b border-border hover:bg-background transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-background border-l-4 border-primary' : ''
                  }`}
                >
                  {participant.avatar_url ? (
                    <img
                      src={participant.avatar_url}
                      alt={participant.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-text">{participant.full_name || participant.username}</p>
                    <p className="text-sm text-textSecondary truncate">{conv.last_message_content}</p>
                  </div>
                  <span className="text-xs text-textSecondary">
                    {new Date(conv.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="p-6 border-b border-border flex items-center gap-3">
              {getParticipant(selectedConversation).avatar_url ? (
                <img
                  src={getParticipant(selectedConversation).avatar_url}
                  alt={getParticipant(selectedConversation).username}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
              )}
              <h3 className="text-xl font-bold text-text">
                {getParticipant(selectedConversation).full_name || getParticipant(selectedConversation).username}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background">
              {loadingMessages ? (
                <div className="flex items-center justify-center p-4 text-primary">
                  <Loader2 className="animate-spin mr-2" size={20} /> Carregando mensagens...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center p-4 text-textSecondary">
                  <p>Comece uma conversa!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        msg.sender_id === currentUser.id
                          ? 'bg-primary text-white rounded-br-none'
                          : 'bg-surface text-text rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <span className="block text-xs text-white/70 mt-1 text-right">
                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-6 border-t border-border bg-surface flex items-center gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 px-4 py-3 border border-border rounded-lg bg-background text-text focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-primary text-white p-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-textSecondary">
            <p>Selecione uma conversa para começar a conversar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
