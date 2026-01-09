import React from 'react';
import { Persona } from '../types';

interface PersonaCardProps {
  persona: Persona;
  isActive: boolean;
  onClick?: () => void; // 클릭 핸들러 추가
}

export const PersonaCard: React.FC<PersonaCardProps> = ({ persona, isActive, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        relative w-full flex flex-row items-center gap-4 p-4 rounded-2xl border transition-all duration-300
        dark:bg-[#1a1a24] dark:border-white/10
        bg-white border-gray-200 shadow-sm
        ${isActive 
          ? 'ring-2 ring-cyber-blue dark:shadow-[0_0_15px_rgba(0,240,255,0.2)] shadow-md scale-[1.02] z-10' 
          : 'opacity-90 hover:opacity-100 hover:shadow-md cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 active:scale-95'
        }
      `}
      style={{
        // Use inline style for flex-basis to distribute height evenly if container is flex-col
        flex: '1 1 0%', 
        minHeight: '80px' 
      }}
    >
      {/* Active Indicator Dot */}
      {isActive && (
        <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
      )}

      {/* Avatar */}
      <div 
        className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-2 shadow-inner transition-colors"
        style={{ 
          backgroundColor: isActive ? persona.color : (isActive ? '#fff' : '#f0f0f0'),
          borderColor: persona.color,
          color: isActive ? '#fff' : '#555',
        }}
      >
        {persona.avatarInitial}
      </div>

      {/* Text Info */}
      <div className="flex flex-col min-w-0 flex-1 justify-center">
        <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-base font-bold dark:text-gray-100 text-gray-800 truncate leading-tight">
                {persona.name}
            </h3>
        </div>
        <p className="text-xs font-semibold dark:text-gray-400 text-gray-500 uppercase tracking-wide truncate mb-1">
            {persona.role}
        </p>
        <p className="text-xs dark:text-gray-500 text-gray-400 truncate leading-tight opacity-80">
            {persona.personality}
        </p>
      </div>
      
      {/* Hover hint for interaction */}
      {!isActive && (
        <div className="absolute right-2 bottom-2 opacity-0 hover:opacity-100 transition-opacity text-[10px] text-gray-400 font-mono hidden md:block group-hover:block">
            클릭하여 발언 요청
        </div>
      )}
    </div>
  );
};