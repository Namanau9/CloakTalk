import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { encryptMessage, decryptMessage } from '../utils/crypto';
import { emitTyping, stopTyping } from '../utils/socket';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import ChatBubble from '../components/ChatBubble';

export default function Chat() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, privateKey, socket } = useAuth();
  const [contact, setContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load contact info, then messages
  useEffect(() => {
    if (!privateKey) return;
    loadContact();
  }, [userId, privateKey]);

  // Load messages once contact is loaded
  useEffect(() => {
    if (!contact || !privateKey) return;
    loadMessages();
  }, [contact, privateKey]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !privateKey || !contact) return;

    const handleNewMessage = async (data) => {
      // Only handle messages from/to the current contact
      if (data.senderId !== userId && data.receiverId !== userId) return;

      try {
        const otherPublicKey = contact.publicKey;
        if (!otherPublicKey) {
          setMessages((prev) => [
            ...prev,
            {
              ...data,
              decryptedContent: '🔒 Encrypted (no key available)',
              senderName: data.senderId === user.id ? 'You' : (contact?.name || 'Unknown'),
            },
          ]);
          return;
        }

        const decryptedContent = await decryptMessage(
          data.encryptedContent,
          data.iv,
          privateKey,
          otherPublicKey
        );

        setMessages((prev) => [
          ...prev,
          {
            ...data,
            decryptedContent,
            senderName: data.senderId === user.id ? 'You' : (contact?.name || 'Unknown'),
          },
        ]);
      } catch (err) {
        console.error('Failed to decrypt incoming message:', err);
        setMessages((prev) => [
          ...prev,
          {
            ...data,
            decryptedContent: '🔒 Encrypted message',
            senderName: data.senderId === user.id ? 'You' : (contact?.name || 'Unknown'),
          },
        ]);
      }
    };

    const handleTyping = ({ userId: typingUserId, isTyping: typing }) => {
      if (typingUserId === userId) {
        setIsTyping(typing);
      }
    };

    socket.on('message:received', handleNewMessage);
    socket.on('typing:update', handleTyping);

    return () => {
      socket.off('message:received', handleNewMessage);
      socket.off('typing:update', handleTyping);
    };
  }, [socket, userId, privateKey, contact]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadContact = async () => {
    try {
      const data = await api.getUser(userId);
      if (!data.user) {
        toast.error('User not found');
        navigate('/', { replace: true });
        return;
      }
      setContact(data.user);
    } catch {
      toast.error('Failed to load user');
      navigate('/', { replace: true });
    }
  };

  const loadMessages = async () => {
    try {
      const data = await api.getMessages(userId);
      
      // If contact hasn't set up public key, show messages as encrypted
      if (!contact?.publicKey) {
        setMessages(
          data.messages.map((msg) => ({
            ...msg,
            decryptedContent: '🔒 Encrypted',
            senderName: msg.senderId === user.id ? 'You' : (contact?.name || 'Unknown'),
          }))
        );
        setIsLoading(false);
        return;
      }

      const decryptedMessages = [];

      for (const msg of data.messages) {
        try {
          const decryptedContent = await decryptMessage(
            msg.encryptedContent,
            msg.iv,
            privateKey,
            contact.publicKey
          );

          decryptedMessages.push({
            ...msg,
            decryptedContent,
            senderName: msg.senderId === user.id ? 'You' : (contact?.name || 'Unknown'),
          });
        } catch {
          decryptedMessages.push({
            ...msg,
            decryptedContent: '🔒 Could not decrypt',
            senderName: msg.senderId === user.id ? 'You' : (contact?.name || 'Unknown'),
          });
        }
      }

      setMessages(decryptedMessages);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    // Stop typing indicator
    stopTyping(socket, userId);

    try {
      // Fetch contact's public key if we don't have it
      let publicKey = contact?.publicKey;
      if (!publicKey) {
        const data = await api.getUser(userId);
        publicKey = data.user?.publicKey;
        if (!publicKey) {
          toast.error("Contact hasn't set up encryption yet");
          setIsSending(false);
          return;
        }
        setContact((prev) => ({ ...prev, publicKey }));
      }

      // Encrypt the message
      const { ciphertext, iv } = await encryptMessage(messageText, privateKey, publicKey);

      // Send via socket
      if (socket?.connected) {
        socket.emit('message:send', { receiverId: userId, encryptedContent: ciphertext, iv }, (response) => {
          if (response?.success) {
            setMessages((prev) => [
              ...prev,
              {
                ...response.message,
                decryptedContent: messageText,
                senderName: 'You',
              },
            ]);
          } else if (response?.error) {
            toast.error(response.error);
            // Fall back to REST API
            sendViaRest(messageText, ciphertext, iv);
          }
        });
      } else {
        // Fall back to REST API
        await sendViaRest(messageText, ciphertext, iv);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Failed to send message');
      setNewMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const sendViaRest = async (plaintext, ciphertext, iv) => {
    try {
      const data = await api.sendMessage(userId, ciphertext, iv);
      setMessages((prev) => [
        ...prev,
        {
          ...data.message,
          decryptedContent: plaintext,
          senderName: 'You',
        },
      ]);
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (socket?.connected) {
      emitTyping(socket, userId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <Navbar title={contact?.name || 'Chat'} />

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Contact Header */}
        <div className="px-4 py-3 border-b border-dark-700/50 bg-dark-900/30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="btn-ghost p-1.5 -ml-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-3 flex-1">
              {contact?.avatar ? (
                <img src={contact.avatar} alt={contact.name} className="w-9 h-9 rounded-full" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary-600/20 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-300">
                    {contact?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-dark-100">{contact?.name}</p>
                <p className="text-xs text-dark-500">{contact?.email}</p>
              </div>
            </div>

            {/* Encryption indicator */}
            <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="hidden sm:inline">E2E Encrypted</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && !isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-800 flex items-center justify-center">
                  <svg className="w-8 h-8 text-dark-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p className="text-dark-400 text-sm">No messages yet</p>
                <p className="text-dark-500 text-xs mt-1">
                  Send a message to start an encrypted conversation
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatBubble
              key={msg.id || i}
              message={msg}
              isSent={msg.senderId === user.id}
              showSender={i === 0 || messages[i - 1]?.senderId !== msg.senderId}
            />
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start">
              <div className="message-received">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-dark-700/50 p-4 bg-dark-900/50">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="glass-input w-full pr-4 resize-none min-h-[44px] max-h-32 py-3"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || isSending}
              className="btn-primary p-3 rounded-xl flex-shrink-0"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
