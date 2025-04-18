/* eslint-disable react/button-has-type */
/* eslint-disable react/no-array-index-key */
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import React, { useState, useEffect } from 'react';

interface ChatMessage {
  text: string;
  type: 'user' | 'server';
  timestamp: Date;
}

function Hello() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const unsubscribe = window.electron.ipcRenderer.onServerMessage(
      (serverMsg) => {
        setMessages((prevMessages) => [
          ...prevMessages,
          { text: serverMsg, type: 'server', timestamp: new Date() },
        ]);
      },
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleSendMessage = () => {
    if (message.trim()) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: message, type: 'user', timestamp: new Date() },
      ]);

      window.electron.ipcRenderer.sender(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-gray-900 font-sans">
      <div className="bg-emerald-800 text-white p-4 flex items-center shadow-md">
        <div className="w-10 h-10 rounded-full bg-emerald-700 flex justify-center items-center mr-4 text-lg font-bold">
          H
        </div>
        <div>
          <h1 className="m-0 text-lg font-bold">Hubify Chat</h1>
          <p className="m-0 text-xs opacity-80">Connected to server</p>
        </div>
      </div>

      <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-10 text-sm">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`
                relative max-w-[80%] p-3 shadow-sm
                ${
                  msg.type === 'user'
                    ? 'self-end bg-green-100 rounded-l-lg rounded-tr-lg mr-3'
                    : 'self-start bg-white rounded-r-lg rounded-bl-lg ml-3'
                }
              `}
            >
              {msg.type === 'server' && (
                <div className="absolute left-[-12px] top-0 w-0 h-0 border-t-0 border-t-transparent border-r-[12px] border-r-white border-b-[12px] border-b-transparent" />
              )}
              {msg.type === 'user' && (
                <div className="absolute right-[-12px] top-0 w-0 h-0 border-t-0 border-t-transparent border-l-[12px] border-l-green-100 border-b-[12px] border-b-transparent" />
              )}
              <div className="text-gray-800">{msg.text}</div>
              <div className="text-xs text-gray-400 text-right mt-1">
                {msg.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex p-4 bg-white items-center shadow-inner border-t border-gray-200">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message"
          aria-label="Message input"
          className="flex-1 rounded-full py-3 px-4 text-sm bg-gray-100 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
        />
        <button
          onClick={handleSendMessage}
          aria-label="Send message"
          className={`
            w-10 h-10 ml-3 rounded-full flex justify-center items-center transition-colors
            ${message.trim() ? 'bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700' : 'bg-gray-200 text-gray-400 cursor-default'}
          `}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
