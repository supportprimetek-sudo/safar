import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, MessageSquare, CheckCheck } from 'lucide-react';
import { Ride, SOCKET_EVENTS } from '@safar/shared';
import { Socket } from 'socket.io-client';

interface DriverChatsViewProps {
  currentRide?: Ride | null;
  socket?: Socket | null;
}

interface ChatMessage {
  id: string;
  senderRole: 'RIDER' | 'DRIVER';
  senderName: string;
  text: string;
  timestamp: string;
}

export const DriverChatsView: React.FC<DriverChatsViewProps> = ({ currentRide, socket }) => {
  const rideId = currentRide?.id;
  const storageKey = rideId ? `safar_chat_${rideId}` : null;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [
      {
        id: 'init_1',
        senderRole: 'RIDER',
        senderName: 'Passenger',
        text: 'Hi! Are you near the pickup point?',
        timestamp: new Date().toISOString(),
      },
    ];
  });

  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket || !rideId) return;

    socket.emit(SOCKET_EVENTS.JOIN_RIDE_ROOM, rideId);

    const handleNewMessage = (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const updated = [...prev, msg];
        if (storageKey) {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        }
        return updated;
      });
    };

    socket.on(SOCKET_EVENTS.CHAT_NEW_MESSAGE, handleNewMessage);

    return () => {
      socket.off(SOCKET_EVENTS.CHAT_NEW_MESSAGE, handleNewMessage);
    };
  }, [socket, rideId, storageKey]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    const newMsg: ChatMessage = {
      id: `driver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderRole: 'DRIVER',
      senderName: 'Driver',
      text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => {
      const updated = [...prev, newMsg];
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
      return updated;
    });

    if (socket && rideId) {
      socket.emit(SOCKET_EVENTS.CHAT_SEND_MESSAGE, {
        rideId,
        senderRole: 'DRIVER',
        senderName: 'Driver',
        text,
        timestamp: newMsg.timestamp,
      });
    }

    setInput('');
  };

  const quickReplies = [
    'I have arrived at pickup location',
    'Stuck in traffic for 2 mins',
    'Please come near pickup point',
    'I am outside in vehicle',
    'Please wait, reaching soon',
  ];

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return ts;
    }
  };

  const riderName = currentRide?.rider?.fullName || currentRide?.rider?.phone || 'Current Passenger';
  const riderPhone = currentRide?.rider?.phone || '+919876543210';

  return (
    <div className="h-full w-full bg-safar-bg p-4 pt-2 pb-[max(7rem,env(safe-area-inset-bottom,32px))] max-w-lg mx-auto flex flex-col justify-between rapido-scroll-container">
      {/* Sticky Frozen Opaque Header */}
      <div className="sticky top-0 z-30 pt-[max(2.5rem,env(safe-area-inset-top,32px))] pb-2 bg-[#11151D] border-b border-white/10 -mx-4 px-4 mb-2">
        <div className="bg-safar-card p-3.5 rounded-3xl border border-white/10 shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-safar-teal/20 text-safar-teal flex items-center justify-center font-extrabold text-lg shadow-md border border-safar-teal/30">
              {riderName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base leading-tight">{riderName}</h3>
              <p className="text-xs text-safar-teal font-bold flex items-center mt-0.5">
                <span className="w-2 h-2 rounded-full bg-safar-teal mr-1.5 animate-pulse" />
                {currentRide ? 'Passenger Connected • Live Chat' : 'Active Passenger Chat'}
              </p>
            </div>
          </div>

          <a
            href={`tel:${riderPhone}`}
            className="w-10 h-10 rounded-2xl bg-safar-teal/20 text-safar-teal border border-safar-teal/30 flex items-center justify-center hover:bg-safar-teal hover:text-safar-bg transition-all active:scale-95 shadow-md"
            title="Call Passenger"
          >
            <Phone className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 my-4 space-y-3 overflow-y-auto px-1 max-h-[calc(100vh-16rem)]">
        {!currentRide && messages.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-safar-card/50 rounded-3xl border border-white/5 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-safar-teal/10 text-safar-teal flex items-center justify-center">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h4 className="font-extrabold text-white text-base">No Active Passenger Chat</h4>
            <p className="text-xs text-safar-textMuted max-w-xs">
              Accept a ride request to start chatting live with your assigned passenger in real-time.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderRole === 'DRIVER';
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] p-3.5 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-safar-teal text-safar-bg font-bold rounded-br-none shadow-lg'
                      : 'bg-safar-card text-white border border-white/10 rounded-bl-none shadow-md'
                  }`}
                >
                  <p className="leading-relaxed font-medium">{msg.text}</p>
                  <div
                    className={`text-[10px] mt-1 flex items-center justify-end space-x-1 ${
                      isMe ? 'text-safar-bg/80 font-bold' : 'text-safar-textMuted'
                    }`}
                  >
                    <span>{formatTime(msg.timestamp)}</span>
                    {isMe && <CheckCheck className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Replies & Input Container */}
      <div className="space-y-2 mb-2">
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {quickReplies.map((reply, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(reply)}
              className="text-xs font-bold bg-safar-card hover:bg-safar-surface text-safar-teal border border-safar-teal/30 px-3.5 py-1.5 rounded-full whitespace-nowrap active:scale-95 transition-all shadow-sm"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message to your passenger..."
            className="flex-1 bg-safar-card border border-white/10 text-white placeholder-safar-textMuted px-4 py-3 rounded-2xl text-sm font-medium focus:outline-none focus:border-safar-teal shadow-inner"
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
