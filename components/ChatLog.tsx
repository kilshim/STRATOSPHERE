import React, { useEffect, useRef } from 'react';
import { Message, Persona } from '../types';

interface ChatLogProps {
  messages: Message[];
  personas: Persona[];
}

export const ChatLog: React.FC<ChatLogProps> = ({ messages, personas }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getPersona = (id: string) => personas.find(p => p.id === id);

  return (
    <div className="w-full p-6 pb-8">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4 min-h-[400px]">
           <div className="w-16 h-16 border-t-4 border-l-4 border-cyber-blue rounded-full animate-spin"></div>
           <div className="text-cyber-blue font-bold text-lg">전략 회의실 데이터 로딩 중...</div>
        </div>
      )}
      
      {messages.map((msg) => {
        const isUser = msg.senderId === 'user';
        const isSystem = msg.senderId === 'system';
        const sender = getPersona(msg.senderId);

        if (isSystem) {
            return (
                <div key={msg.id} className="flex justify-center my-8 opacity-80">
                    <span className="text-sm font-semibold text-cyber-blue dark:text-cyan-400 border border-cyber-blue/30 px-5 py-2 rounded-full bg-cyber-blue/5 shadow-sm">
                        {msg.text}
                    </span>
                </div>
            )
        }

        return (
          <div 
            key={msg.id} 
            className={`flex flex-col max-w-[90%] lg:max-w-[75%] mb-8 ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
          >
            <div className="flex items-center gap-2 mb-2 px-1">
              {!isUser && sender && (
                <div className="flex items-center gap-2">
                     <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-white/20 shadow-sm"
                        style={{ backgroundColor: sender.color }}
                     >
                         {sender.avatarInitial}
                     </div>
                    <span 
                        className="text-sm font-bold tracking-wide"
                        style={{ color: sender.color }}
                    >
                        {sender.name} <span className="text-gray-500 dark:text-gray-400 text-xs font-normal ml-1">| {sender.role}</span>
                    </span>
                </div>
              )}
              {isUser && <span className="text-sm font-bold text-cyber-blue dark:text-cyan-400 tracking-wide">나 (전략가)</span>}
              <span className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            <div 
              className={`
                px-6 py-5 rounded-2xl text-base md:text-lg leading-relaxed shadow-sm
                ${isUser 
                  ? 'bg-blue-50 text-gray-800 dark:bg-cyan-900/30 dark:text-cyan-50 border border-blue-100 dark:border-cyan-500/30 rounded-tr-sm' 
                  : 'bg-white text-gray-800 dark:bg-[#1a1a24] dark:text-gray-200 border border-gray-100 dark:border-white/10 rounded-tl-sm'
                }
              `}
            >
              {msg.text}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
};