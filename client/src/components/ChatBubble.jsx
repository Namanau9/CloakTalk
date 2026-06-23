export default function ChatBubble({ message, isSent, showSender }) {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex flex-col ${isSent ? 'items-end' : 'items-start'} animate-fade-in`}>
      {showSender && !isSent && (
        <p className="text-xs text-dark-500 mb-1 ml-1">{message.senderName}</p>
      )}
      <div className={isSent ? 'message-sent' : 'message-received'}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.decryptedContent || '(encrypted)'}
        </p>
        <div className={`flex items-center gap-1 mt-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[10px] ${isSent ? 'text-primary-200' : 'text-dark-500'}`}>
            {time}
          </span>
          {isSent && (
            <svg className="w-3 h-3 text-primary-300" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
