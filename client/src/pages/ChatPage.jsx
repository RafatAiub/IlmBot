import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectChat, sendMessage, addUserMessage, clearChat } from '../store';
import ChatMessage from '../components/ChatMessage';
import LoadingSpinner from '../components/LoadingSpinner';

const ChatPage = () => {
  const dispatch = useDispatch();
  const { messages, loading, error } = useSelector(selectChat);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const query = inputValue.trim();
    setInputValue('');
    
    // 1. Add user message instantly for UI responsiveness
    dispatch(addUserMessage(query));
    
    // 2. Dispatch async thunk to call RAG API
    dispatch(sendMessage(query));
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear this conversation?')) {
      dispatch(clearChat());
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-800">IlmBot Assistant</h1>
          <p className="text-sm text-gray-500">Ask questions based on the Islamic knowledge base</p>
        </div>
        <button 
          onClick={handleClear}
          disabled={messages.length === 0 || loading}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          Clear Chat
        </button>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="p-3 mx-4 mt-4 text-sm text-red-700 bg-red-100 border border-red-200 rounded-lg shrink-0" role="alert">
          <strong className="font-semibold">Error: </strong> {error}
        </div>
      )}

      {/* Chat Messages Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h2 className="text-lg font-medium text-gray-700">Welcome to IlmBot</h2>
            <p className="mt-2 max-w-md">Type a question below to search the knowledge base. E.g., "What is Tawheed?"</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto flex flex-col">
            {messages.map((msg, index) => (
              <ChatMessage 
                key={index} 
                role={msg.role} 
                content={msg.content} 
                sources={msg.sources} 
              />
            ))}
            
            {loading && (
              <div className="flex justify-start mb-4">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm flex items-center gap-3">
                  <LoadingSpinner size="sm" text="Searching knowledge base..." />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Input Area */}
      <footer className="p-4 bg-white border-t border-gray-200 shrink-0">
        <form 
          onSubmit={handleSubmit}
          className="flex max-w-4xl mx-auto items-end gap-2 bg-gray-50 border border-gray-300 rounded-xl p-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-shadow"
        >
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Ask a question..."
            className="flex-1 max-h-32 min-h-[44px] p-2 bg-transparent resize-none focus:outline-none text-gray-800"
            rows={1}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || loading}
            className="p-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-colors focus:outline-none"
            aria-label="Send message"
          >
            <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        <p className="text-xs text-center text-gray-400 mt-2">
          IlmBot can make mistakes. Consider verifying important information.
        </p>
      </footer>
    </div>
  );
};

export default ChatPage;
