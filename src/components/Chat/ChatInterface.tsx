import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Send, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface ChatInterfaceProps {
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  onClose?: () => void;
}

export function ChatInterface({ otherUserId, otherUserName, otherUserAvatar }: ChatInterfaceProps) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadMessages();
    scrollToBottom();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${profile?.id}:${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=in.(${profile?.id},${otherUserId}),receiver_id=in.(${profile?.id},${otherUserId})`,
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, otherUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${profile.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${profile.id})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', profile.id)
        .eq('sender_id', otherUserId)
        .eq('is_read', false);

      setError(null);
    } catch (err: any) {
      console.error('Error loading messages:', err);
      setError('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!profile || !newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    setSending(true);
    setError(null);

    // Optimistic update - add message immediately
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      sender_id: profile.id,
      receiver_id: otherUserId,
      content: messageContent,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');

    // Focus input immediately after clearing
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    try {
      const { data, error } = await supabase.from('messages').insert({
        sender_id: profile.id,
        receiver_id: otherUserId,
        content: messageContent,
      }).select().single();

      if (error) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter(m => m.id !== optimisticMessage.id));

        if (error.message.includes('no active subscription')) {
          setError('Você precisa ter uma assinatura ativa para enviar mensagens.');
        } else {
          throw error;
        }
      } else if (data) {
        // Replace optimistic message with real one
        setMessages((prev) =>
          prev.map(m => m.id === optimisticMessage.id ? data : m)
        );
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setSending(false);
      // Ensure focus returns after send completes
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white">
        {otherUserAvatar ? (
          <img
            src={otherUserAvatar}
            alt={otherUserName}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
            <span className="text-pink-600 font-semibold text-lg">
              {otherUserName[0]?.toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">@{otherUserName}</h3>
          <p className="text-sm text-green-600">Assinatura ativa</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">Nenhuma mensagem ainda</p>
              <p className="text-sm">Envie a primeira mensagem para começar a conversa!</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isSent = msg.sender_id === profile?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isSent ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div
                    className={`max-w-sm lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                      isSent
                        ? 'bg-gradient-to-r from-pink-600 to-pink-500 text-white rounded-br-sm'
                        : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isSent ? 'text-pink-100' : 'text-gray-500'
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t shadow-lg">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            rows={1}
            disabled={sending}
            autoFocus
            className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="bg-gradient-to-r from-pink-600 to-pink-500 text-white p-3 rounded-full hover:from-pink-700 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:shadow-none"
          >
            {sending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Send className="w-6 h-6" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Pressione Enter para enviar</p>
      </div>
    </div>
  );
}
