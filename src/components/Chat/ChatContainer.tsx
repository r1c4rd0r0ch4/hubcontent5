import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ConversationList } from './ConversationList';
import { ChatInterface } from './ChatInterface';
import { MessageSquare } from 'lucide-react';

interface ChatContainerProps {
  initialSelectedUserId?: string | null;
  onUserSelected?: () => void;
}

export function ChatContainer({ initialSelectedUserId, onUserSelected }: ChatContainerProps) {
  const { profile } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    initialSelectedUserId || null
  );
  const [selectedUserData, setSelectedUserData] = useState<{
    username: string;
    avatar_url: string | null;
  } | null>(null);

  useEffect(() => {
    if (initialSelectedUserId) {
      setSelectedUserId(initialSelectedUserId);
      if (onUserSelected) onUserSelected();
    }
  }, [initialSelectedUserId]);

  useEffect(() => {
    if (selectedUserId) {
      loadUserData(selectedUserId);
    }
  }, [selectedUserId]);

  const loadUserData = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setSelectedUserData(data);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden" style={{ height: '700px' }}>
      <div className="grid grid-cols-1 md:grid-cols-3 h-full">
        {/* Conversations List - Left Side */}
        <div className="col-span-1 border-r flex flex-col overflow-hidden bg-white">
          <ConversationList
            selectedUserId={selectedUserId}
            onSelectUser={handleSelectUser}
          />
        </div>

        {/* Chat Interface - Right Side */}
        <div className="col-span-1 md:col-span-2 flex flex-col overflow-hidden bg-gray-50">
          {selectedUserId && selectedUserData ? (
            <ChatInterface
              otherUserId={selectedUserId}
              otherUserName={selectedUserData.username}
              otherUserAvatar={selectedUserData.avatar_url}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">Selecione uma conversa</p>
                <p className="text-sm">
                  Escolha uma conversa à esquerda para começar a conversar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
