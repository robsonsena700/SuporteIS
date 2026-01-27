import React, { useState, useEffect, useRef } from 'react';
import { User, DirectMessage } from '../types';
import { ChatService } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ChatWindowProps {
  recipient: User;
  onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ recipient, onClose }) => {
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const data = await ChatService.getMessages(recipient.id);
      setMessages(data);
      // If user is at bottom, scroll to bottom? 
      // For now, only on initial load or sending.
    } catch (error) {
      console.error('Failed to fetch messages', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    intervalRef.current = setInterval(fetchMessages, 3000); // Poll every 3s
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [recipient.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, loading]); // Scroll when messages change

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const tempContent = newMessage;
    setNewMessage(''); // Optimistic clear

    try {
      await ChatService.sendMessage(recipient.id, tempContent);
      await fetchMessages(); // Refresh immediately
    } catch (error) {
      console.error('Failed to send message', error);
      setNewMessage(tempContent); // Restore on error
    }
  };

  return (
    <div className="fixed bottom-0 right-0 sm:right-4 w-full sm:w-80 h-[400px] bg-background-surface border-t border-x sm:border border-border-dark rounded-t-xl shadow-2xl z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-primary/10 border-b border-border-dark p-3 flex justify-between items-center cursor-pointer" onClick={onClose}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div 
              className="size-8 rounded-full bg-cover bg-center border border-border-dark"
              style={{ backgroundImage: `url(${recipient.avatar || 'https://ui-avatars.com/api/?name=' + recipient.name})` }}
            />
            <div className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background-surface ${
              recipient.chatStatus === 'online' ? 'bg-success' : 
              recipient.chatStatus === 'busy' ? 'bg-warning' : 'bg-gray-400'
            }`}></div>
          </div>
          <div className="flex flex-col">
             <span className="text-text-primary text-sm font-bold truncate max-w-[150px]">{recipient.name}</span>
             <span className="text-[10px] text-text-secondary">{recipient.profile}</span>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-text-secondary hover:text-text-primary">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 bg-background-dark/50 overflow-y-auto p-3 flex flex-col gap-3">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <span className="text-xs text-text-secondary">Carregando...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <span className="text-xs text-text-secondary">Nenhuma mensagem ainda.</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`
                  max-w-[80%] px-3 py-2 rounded-lg text-sm
                  ${isMe 
                    ? 'bg-primary text-white rounded-br-none' 
                    : 'bg-background-card text-text-secondary rounded-bl-none border border-border-dark'
                  }
                `}>
                  <p>{msg.content}</p>
                  <span className={`text-[9px] block text-right mt-1 ${isMe ? 'text-white/70' : 'text-text-muted'}`}>
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-background-surface border-t border-border-dark flex gap-2">
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="flex-1 bg-background-input border border-border-dark rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none transition-all"
        />
        <button 
          type="submit"
          disabled={!newMessage.trim()}
          className="size-9 bg-primary hover:bg-primary-hover text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
