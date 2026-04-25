import React from 'react';

/**
 * ChatMessage Component
 * Displays a single chat bubble (user or assistant) and renders citations if available.
 * @param {Object} props
 * @param {string} props.role - 'user' | 'assistant'
 * @param {string} props.content - Message text
 * @param {Array} [props.sources] - Optional citations for assistant messages
 */
const ChatMessage = ({ role, content, sources = [] }) => {
  const isUser = role === 'user';

  return (
    // Align right for user, left for assistant
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
          isUser 
            ? 'bg-blue-600 text-white rounded-tr-none' 
            : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200'
        }`}
        // A11y: Identify the message sender for screen readers
        aria-label={`${isUser ? 'You' : 'IlmBot'} said:`}
      >
        {/* Main message content */}
        <p className="text-base leading-relaxed whitespace-pre-wrap">
          {content}
        </p>

        {/* Render citations if this is an assistant response with sources */}
        {!isUser && sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-300">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Sources:
            </h4>
            <ul className="space-y-1">
              {sources.map((source, idx) => (
                <li key={source.id || idx} className="text-sm">
                  <a 
                    href={`/article/${source.id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                    aria-label={`Source: ${source.title}`}
                  >
                    [{idx + 1}] {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
