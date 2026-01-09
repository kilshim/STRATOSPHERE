export interface Persona {
  id: string;
  role: string; // e.g., "Marketing Director", "CFO"
  name: string;
  personality: string; // e.g., "Aggressive, Data-driven"
  color: string; // Hex code for UI accent
  avatarInitial: string;
}

export interface Message {
  id: string;
  senderId: string; // Persona ID or 'user' or 'system'
  text: string;
  timestamp: number;
}

export interface SimulationState {
  isActive: boolean;
  topic: string;
  industry: string;
  round: number;
  maxRounds: number;
}

export interface MeetingRecord {
  id: string;
  date: number;
  topic: string;
  industry: string;
  summary: string;
  transcript: Message[];
  personas: Persona[];
}

export type ViewMode = 'SETUP' | 'SIMULATION' | 'HISTORY';
