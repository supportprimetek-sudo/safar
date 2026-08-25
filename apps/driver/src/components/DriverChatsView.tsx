import React, { useState } from 'react';
import { Send, Phone, User, MessageSquare, CheckCheck } from 'lucide-react';

export const DriverChatsView: React.FC = () => {
  const [messages, setMessages] = useState([
    { id: '1', sender: 'rider', text: 'Hi! Are you near the pickup point?', time: '10:40 AM' },
    { id: '2', sender: 'driver', text: 'Yes, I am reaching in 2 minutes.', time: '10:41 AM' },
    { id: '3', sender: 'rider', text: 'Okay, I am standing near the main gate.', time: '10:42 AM' },
  ]);

  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: 'driver', text: input.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);
    setInput('');
  };

  const quickReplies = [
    'I have arrived at pickup location',
    'Stuck in traffic for 2 mins',
    'Please come near the gate',
    'I am outside in White Vehicle',
  ];

  return (
    <div className="min-h-screen bg-safar-bg p-4 pt-2 pb-[max(7rem,env(safe-area-inset-bottom,32px))] max-w-lg mx-auto flex flex-col justify-between">
      {/* Sticky Frozen Opaque Header */}
      <div className="sticky top-0 z-30 pt-[max(2.5rem,env(safe-area-inset-top,32px))] pb-2 bg-[#11151D] border-b border-white/10 -mx-4 px-4 mb-2">
        <div className="bg-safar-card p-3.5 rounded-3xl border border-white/10 shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-safar-teal/20 text-safar-teal flex items-center justify-center font-extrabold text-lg">
              P
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Current Passenger</h3>
              <p className="text-xs text-safar-teal font-bold flex items-center">
                <span className="w-2 h-2 rounded-full bg-safar-teal mr-1.5 animate-pulse" />
                Active Passenger Chat
              </p>
            </div>
          </div>

          <a
            href="tel:+919876543210"
            className="w-10 h-10 rounded-2xl bg-safar-surface border border-white/10 text-safar-teal flex items-center justify-center hover:bg-safar-card active:scale-95 transition-all"
          >
            <Phone className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 my-4 space-y-3 overflow-y-auto px-1">
        {messages.map((msg) => {
          const isDriver = msg.sender === 'driver';
          return (
            <div key={msg.id} className={`flex ${isDriver ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] p-3.5 rounded-2xl text-sm ${
                  isDriver
                    ? 'bg-safar-teal text-safar-bg font-semibold rounded-br-none shadow-md'
                    : 'bg-safar-card text-white border border-white/10 rounded-bl-none shadow-md'
                }`}
              >
                <p className="leading-relaxed">{msg.text}</p>
                <div className={`text-[10px] mt-1 flex items-center justify-end space-x-1 ${isDriver ? 'text-safar-bg/80 font-bold' : 'text-safar-textMuted'}`}>
                  <span>{msg.time}</span>
                  {isDriver && <CheckCheck className="w-3 h-3" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Replies */}
      <div className="space-y-2 mb-2">
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {quickReplies.map((reply, idx) => (
            <button
              key={idx}
              onClick={() => setInput(reply)}
              className="text-xs font-semibold bg-safar-card hover:bg-safar-surface text-safar-teal border border-safar-teal/30 px-3 py-1.5 rounded-full whitespace-nowrap"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message to your passenger..."
            className="flex-1 bg-safar-card border border-white/10 text-white placeholder-safar-textMuted px-4 py-3 rounded-2xl text-sm font-medium focus:outline-none focus:border-safar-teal"
          />
          <button
            type="submit"
            className="w-12 h-12 bg-safar-teal text-safar-bg font-bold rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
