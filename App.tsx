import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Persona, Message, SimulationState, ViewMode, MeetingRecord } from './types';
import { generatePersonas, generateNextTurn, generateSummary, generateWebsiteContent } from './services/geminiService';
import { PersonaCard } from './components/PersonaCard';
import { ChatLog } from './components/ChatLog';
import { HistoryView } from './components/HistoryView';
import { GuideModal } from './components/GuideModal';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('SETUP');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [simulationState, setSimulationState] = useState<SimulationState>({
    isActive: false,
    topic: '',
    industry: '',
    round: 0,
    maxRounds: 10
  });
  const [currentSpeakerId, setCurrentSpeakerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  
  // UI States
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Mobile Sidebar State
  
  // Website Generation State
  const [websiteLoading, setWebsiteLoading] = useState(false);
  
  // Chat Input State
  const [inputValue, setInputValue] = useState("");

  // API Key Management State
  const [apiKeyInput, setApiKeyInput] = useState("");

  // Persistence
  const [historyRecords, setHistoryRecords] = useState<MeetingRecord[]>([]);

  // Refs for loop control to avoid dependency cycles
  const stateRef = useRef(simulationState);
  
  // Update ref via effect to ensure latest state is accessible in timeouts
  useEffect(() => {
    stateRef.current = simulationState;
  }, [simulationState]);

  useEffect(() => {
    // Load History
    const saved = localStorage.getItem('stratosphere_history');
    if (saved) {
      try {
        setHistoryRecords(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  useEffect(() => {
    // Load API Key from session storage
    const storedKey = sessionStorage.getItem('gemini_api_key');
    if (storedKey) {
        setApiKeyInput(storedKey);
    }
  }, []);

  // Theme Handling
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [darkMode]);

  const saveRecord = useCallback((newSummary: string) => {
    const record: MeetingRecord = {
      id: Date.now().toString(),
      date: Date.now(),
      topic: simulationState.topic,
      industry: simulationState.industry,
      summary: newSummary,
      transcript: messages,
      personas: personas,
    };
    
    const newHistory = [...historyRecords, record];
    setHistoryRecords(newHistory);
    localStorage.setItem('stratosphere_history', JSON.stringify(newHistory));
  }, [historyRecords, messages, personas, simulationState]);

  const handleClearHistory = () => {
    if (window.confirm("모든 회의 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      setHistoryRecords([]);
      localStorage.removeItem('stratosphere_history');
      alert("기록이 삭제되었습니다.");
    }
  };

  const handleDeleteRecord = (id: string) => {
    const newHistory = historyRecords.filter(r => r.id !== id);
    setHistoryRecords(newHistory);
    localStorage.setItem('stratosphere_history', JSON.stringify(newHistory));
  };

  const handleSaveApiKey = () => {
    if (!apiKeyInput.trim()) {
        alert("API Key를 입력해주세요.");
        return;
    }
    sessionStorage.setItem('gemini_api_key', apiKeyInput.trim());
    alert("API Key가 저장되었습니다. (세션 유지 시 유효)");
  };

  const handleDeleteApiKey = () => {
    sessionStorage.removeItem('gemini_api_key');
    setApiKeyInput("");
    alert("API Key가 삭제되었습니다.");
  };

  // Helper to extract nice error message
  const getErrorMessage = (error: any): string => {
    const msg = error?.message || "";
    if (msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        return "API 사용량이 초과되었습니다 (429). 잠시 후 다시 시도하거나, 유료 API Key를 사용해주세요.";
    }
    return msg || "알 수 없는 오류";
  };

  // --- CORE TURN LOGIC ---
  const processTurn = useCallback(async (forcedSpeakerId?: string) => {
      // 만약 자동 모드에서 이미 비활성화 상태라면 중단 (타이머 실행 직전 상태 변경 대응)
      // forcedSpeakerId가 있으면 수동 실행이므로 stateRef 체크 무시
      if (!forcedSpeakerId && !stateRef.current.isActive) return;
      
      if (loading) return; 

      if (personas.length === 0) {
        console.warn("페르소나 데이터가 없습니다.");
        setSimulationState(prev => ({ ...prev, isActive: false }));
        return;
      }
      
      const currentState = stateRef.current;
      
      if (!forcedSpeakerId && currentState.round >= currentState.maxRounds) {
          setSimulationState(prev => ({ ...prev, isActive: false }));
          return;
      }

      setLoading(true);
      try {
          let nextSpeaker: Persona | undefined;

          if (forcedSpeakerId) {
              nextSpeaker = personas.find(p => p.id === forcedSpeakerId);
          } else {
              const speakerIndex = currentState.round % personas.length;
              nextSpeaker = personas[speakerIndex];
          }

          if (!nextSpeaker) throw new Error("No speaker found");

          setCurrentSpeakerId(nextSpeaker.id);

          // 1초 대기 (생각하는 척)
          await new Promise(resolve => setTimeout(resolve, 1000));

          const text = await generateNextTurn(
              currentState.topic,
              messages,
              personas,
              nextSpeaker.id
          );

          if (!text) throw new Error("Generated text is empty");

          const newMessage: Message = {
              id: Date.now().toString(),
              senderId: nextSpeaker.id,
              text,
              timestamp: Date.now()
          };

          setMessages(prev => [...prev, newMessage]);
          setSimulationState(prev => ({ ...prev, round: prev.round + 1 }));

      } catch (error) {
          console.error("Turn generation failed", error);
          const errorMsg = getErrorMessage(error);
          alert(`AI 응답 생성 실패:\n${errorMsg}`);
          
          // 에러 발생 시 자동 모드 중지
          setSimulationState(prev => ({ ...prev, isActive: false }));
      } finally {
          setLoading(false);
          setCurrentSpeakerId(null);
      }
  }, [personas, messages, loading]);


  // --- AUTO LOOP EFFECT ---
  // processTurn 최신 버전을 ref에 저장하여 timer 콜백이 항상 최신 함수를 참조하도록 함
  const processTurnRef = useRef(processTurn);
  useEffect(() => {
    processTurnRef.current = processTurn;
  }, [processTurn]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (simulationState.isActive && !loading && viewMode === 'SIMULATION') {
        // 1.2초 후 다음 턴 진행
        timer = setTimeout(() => {
            processTurnRef.current();
        }, 1200);
    }

    return () => {
        if (timer) clearTimeout(timer);
    };
  }, [simulationState.isActive, loading, viewMode]);


  // --- HANDLERS ---

  const handlePersonaClick = (personaId: string) => {
      if (!loading) {
          processTurn(personaId);
          setMobileMenuOpen(false); // Close mobile menu on selection
      }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    const newMessage: Message = { 
        id: Date.now().toString(), 
        senderId: 'user', 
        text: inputValue, 
        timestamp: Date.now() 
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputValue("");
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulationState.topic || !simulationState.industry) return;

    setLoading(true);
    try {
        const generatedPersonas = await generatePersonas(simulationState.industry, simulationState.topic);
        
        if (!generatedPersonas || generatedPersonas.length === 0) {
           throw new Error("페르소나 생성에 실패했습니다.");
        }

        setPersonas(generatedPersonas);
        
        const initialMessage: Message = {
            id: 'init',
            senderId: 'system',
            text: `시스템 시작: ${simulationState.industry} 분야 - ${simulationState.topic} 전략 회의`,
            timestamp: Date.now()
        };
        setMessages([initialMessage]);
        setViewMode('SIMULATION');
        setSimulationState(prev => ({ ...prev, isActive: true, round: 0 }));
    } catch (error) {
        const errorMsg = getErrorMessage(error);
        alert(`AI 초기화 실패:\n${errorMsg}`);
    } finally {
        setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
      if (messages.length < 2) {
          alert("아직 분석할 대화 내용이 충분하지 않습니다.");
          return;
      }
      setSimulationState(prev => ({ ...prev, isActive: false }));
      
      setLoading(true);
      try {
        const sum = await generateSummary(simulationState.topic, messages, personas);
        setSummary(sum);
        saveRecord(sum);
        setLoading(false);
        setShowReportModal(true);
      } catch (error) {
        setLoading(false);
        alert("리포트 생성 실패: " + getErrorMessage(error));
      }
  };

  const handleCopyReport = async () => {
      if (summary) {
          try {
              await navigator.clipboard.writeText(summary);
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 2000);
          } catch (err) {
              console.error('Failed to copy text: ', err);
          }
      }
  };

  const handleDownloadWebsite = async () => {
    if (!summary) return;
    setWebsiteLoading(true);
    try {
        const htmlContent = await generateWebsiteContent(simulationState.topic, summary);
        
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${simulationState.topic.replace(/\s+/g, '_')}_report.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to generate website", error);
        alert("웹사이트 생성 중 오류가 발생했습니다: " + getErrorMessage(error));
    } finally {
        setWebsiteLoading(false);
    }
  };

  const handleLoadRecord = (record: MeetingRecord) => {
    setMessages(record.transcript);
    setPersonas(record.personas);
    setSummary(record.summary);
    setSimulationState({
        isActive: false,
        topic: record.topic,
        industry: record.industry,
        round: 0,
        maxRounds: 10
    });
    setViewMode('SIMULATION');
    setShowReportModal(true);
  };

  // --- RENDER HELPERS ---

  const renderSetup = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-fade-in relative">
      
      {/* Top Right Guide Button */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 flex gap-3">
        <button 
            onClick={() => setShowGuideModal(true)}
            className="w-10 h-10 rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-blue-500 hover:bg-blue-50 dark:hover:bg-white/10 transition-colors shadow-sm"
            title="사용 가이드"
        >
            <span className="text-xl font-bold">?</span>
        </button>
      </div>

      <div className="w-full max-w-lg glass-panel p-6 md:p-10 rounded-3xl shadow-2xl dark:border-white/10 border-gray-200">
        <h1 className="text-3xl md:text-5xl font-extrabold dark:text-white text-gray-900 mb-2 tracking-tighter text-center">
            STRATOSPHERE
        </h1>
        <p className="dark:text-cyber-blue text-blue-600 text-center mb-6 font-bold tracking-widest text-xs md:text-sm uppercase">AI Future Strategy Room</p>
        
        {/* Intro Section */}
        <div className="text-center mb-8 bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/5">
           <p className="text-gray-700 dark:text-gray-200 text-sm font-medium leading-relaxed break-keep mb-2">
             <strong>5명의 AI 전문가</strong>로 구성된 가상의 이사회를 소집하세요.
           </p>
           <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed break-keep">
             CEO, CTO, 마케터 등 다양한 관점의 페르소나들이<br className="hidden sm:block" />
             당신의 비즈니스 주제를 입체적으로 분석하고<br className="hidden sm:block" />
             <strong>실행 가능한 전략 리포트</strong>를 도출해냅니다.
           </p>
        </div>
        
        <form onSubmit={handleStart} className="space-y-6 md:space-y-8">
          <div>
            <label className="block text-xs font-bold dark:text-gray-400 text-gray-500 mb-2 uppercase tracking-widest ml-1">산업 / 분야</label>
            <input 
              type="text"
              value={simulationState.industry}
              onChange={(e) => setSimulationState({...simulationState, industry: e.target.value})}
              placeholder="예: 핀테크, 바이오"
              className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-3 md:p-4 text-base md:text-lg dark:text-white text-gray-900 focus:border-blue-500 dark:focus:border-cyber-blue outline-none transition-all shadow-inner"
            />
          </div>
          <div>
            <label className="block text-xs font-bold dark:text-gray-400 text-gray-500 mb-2 uppercase tracking-widest ml-1">전략 주제</label>
            <input 
              type="text"
              value={simulationState.topic}
              onChange={(e) => setSimulationState({...simulationState, topic: e.target.value})}
              placeholder="예: 구독 모델 출시 전략"
              className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-3 md:p-4 text-base md:text-lg dark:text-white text-gray-900 focus:border-blue-500 dark:focus:border-cyber-blue outline-none transition-all shadow-inner"
            />
          </div>
          <button 
            type="submit"
            disabled={loading || !simulationState.topic}
            className="w-full bg-blue-600 dark:bg-cyber-blue hover:bg-blue-700 dark:hover:bg-cyan-400 text-white dark:text-cyber-black py-4 md:py-5 rounded-xl font-bold text-lg tracking-wider uppercase transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1"
          >
            {loading ? '전문가 소집 중...' : '전략 회의 시작'}
          </button>
        </form>

        <div className="mt-8 text-center flex justify-center gap-6">
            <button 
                onClick={() => setViewMode('HISTORY')}
                className="text-sm dark:text-gray-400 text-gray-500 hover:text-blue-600 dark:hover:text-white underline decoration-transparent hover:decoration-current underline-offset-4 transition-all"
            >
                기록 보관소
            </button>
            <button 
                onClick={() => setShowSettingsModal(true)}
                className="text-sm dark:text-gray-400 text-gray-500 hover:text-blue-600 dark:hover:text-white underline decoration-transparent hover:decoration-current underline-offset-4 transition-all"
            >
                설정
            </button>
        </div>
      </div>
      
      {/* Footer Link */}
      <div className="mt-12 opacity-50 hover:opacity-100 transition-opacity">
        <a 
            href="https://xn--design-hl6wo12cquiba7767a.com/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-cyber-blue font-mono tracking-widest border-b border-transparent hover:border-current pb-0.5 transition-all"
        >
            떨림과울림Design.com
        </a>
      </div>
    </div>
  );

  // Common Sidebar Content to be reused in Desktop and Mobile views
  const renderSidebarContent = () => (
      <>
        <div className="p-4 border-b border-gray-200 dark:border-white/5 bg-gray-100/50 dark:bg-white/5 flex justify-between items-center">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                참여 전문가
            </h3>
            {/* Mobile Only Close Button */}
            <button 
                onClick={() => setMobileMenuOpen(false)} 
                className="md:hidden text-gray-500 dark:text-gray-400"
            >
                ✕
            </button>
        </div>
        
        {/* Persona List Container */}
        <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto">
            {personas.map((p) => (
                <PersonaCard 
                    key={p.id} 
                    persona={p} 
                    isActive={currentSpeakerId === p.id} 
                    onClick={() => handlePersonaClick(p.id)}
                />
            ))}
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/20 flex flex-col gap-3">
            <div className="flex items-center justify-between px-2">
                <span className="text-sm font-bold dark:text-gray-300 text-gray-600">자동 토론 모드</span>
                <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${simulationState.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} onClick={() => setSimulationState(p => ({...p, isActive: !p.isActive}))}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${simulationState.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => setShowSettingsModal(true)}
                    className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                    <span>⚙️ 설정</span>
                </button>
                 <button 
                    onClick={() => setShowGuideModal(true)}
                    className="w-12 py-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-blue-500 dark:text-blue-400 text-lg font-bold hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center justify-center"
                    title="사용 가이드"
                >
                    ?
                </button>
            </div>
        </div>
      </>
  );

  const renderRoom = () => (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-paper dark:bg-cyber-black transition-colors duration-500 relative">
      {/* Header */}
      <header className="flex shrink-0 justify-between items-center bg-white/80 dark:bg-cyber-black/80 p-4 md:p-5 border-b border-gray-200 dark:border-white/10 backdrop-blur-md z-20">
        <div className="flex items-center gap-3 overflow-hidden">
             {/* Mobile Hamburger Button */}
             <button 
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
             >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
             </button>

            <div className="flex flex-col overflow-hidden">
                <h2 className="text-lg md:text-xl font-extrabold dark:text-white text-gray-900 tracking-tight truncate">{simulationState.topic}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] md:text-xs font-bold text-blue-600 dark:text-cyber-blue bg-blue-50 dark:bg-cyber-blue/10 px-1.5 py-0.5 rounded truncate max-w-[120px]">{simulationState.industry}</span>
                    <span className="hidden md:inline text-xs text-gray-400">|</span>
                    <span className="hidden md:inline text-xs text-gray-500 font-medium">
                        {simulationState.isActive ? '🟢 실시간 토론 중' : '⚪ 대기 중'}
                    </span>
                    <span className="md:hidden text-[10px] text-gray-500">
                        {simulationState.isActive ? '🟢' : '⚪'}
                    </span>
                </div>
            </div>
        </div>
        <div className="flex gap-2 shrink-0">
            {!simulationState.isActive && (
               <button 
                 onClick={() => setSimulationState(p => ({...p, isActive: true}))}
                 className="px-3 md:px-5 py-2 bg-green-500 text-white text-xs md:text-sm font-bold rounded-lg shadow-md hover:bg-green-600 transition-colors whitespace-nowrap"
               >
                 계속
               </button>
            )}
            {simulationState.isActive && (
                <button 
                    onClick={() => setSimulationState(p => ({...p, isActive: false}))}
                    className="px-3 md:px-5 py-2 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs md:text-sm font-bold rounded-lg border border-red-200 dark:border-red-500/30 hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors whitespace-nowrap"
                >
                    중지
                </button>
            )}
            <button onClick={() => setViewMode('SETUP')} className="px-3 md:px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-xs md:text-sm font-medium border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 whitespace-nowrap">나가기</button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Desktop Left Sidebar: Personas */}
        <div className="hidden md:flex w-[340px] shrink-0 bg-gray-50 dark:bg-cyber-dark border-r border-gray-200 dark:border-white/10 flex-col h-full z-10 shadow-xl">
            {renderSidebarContent()}
        </div>

        {/* Mobile Sidebar Overlay (Drawer) */}
        {mobileMenuOpen && (
            <div className="absolute inset-0 z-50 flex md:hidden">
                <div 
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                    onClick={() => setMobileMenuOpen(false)}
                />
                <div className="relative w-[85%] max-w-[320px] h-full bg-white dark:bg-cyber-dark shadow-2xl flex flex-col animate-slide-in-left border-r border-gray-200 dark:border-white/10">
                    {renderSidebarContent()}
                </div>
            </div>
        )}

        {/* Center: Chat Log */}
        <div className="flex-1 flex flex-col relative bg-white dark:bg-gradient-to-b dark:from-cyber-black/20 dark:to-cyber-black/40">
            {/* Chat History Container */}
            <div className="flex-1 overflow-y-auto relative scroll-smooth bg-gray-50/50 dark:bg-transparent flex justify-center">
                 <div className="w-full max-w-[800px]">
                     <ChatLog messages={messages} personas={personas} />
                 </div>
            </div>

            {/* Bottom Input Area */}
            <div className="p-3 md:p-6 bg-white dark:bg-cyber-dark border-t border-gray-200 dark:border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] shrink-0 z-20">
                <div className="flex gap-2 md:gap-3 max-w-[800px] mx-auto">
                    <input 
                        type="text" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="의견을 입력하세요..."
                        className="flex-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 md:px-6 md:py-4 text-sm md:text-base dark:text-white text-gray-900 focus:border-blue-500 dark:focus:border-cyber-blue focus:bg-white dark:focus:bg-white/10 outline-none transition-all placeholder-gray-500 shadow-inner"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSendMessage();
                            }
                        }}
                    />
                    <button 
                        onClick={handleSendMessage}
                        className="bg-blue-600 hover:bg-blue-700 dark:bg-cyber-blue/20 dark:hover:bg-cyber-blue/30 text-white dark:text-cyber-blue border border-transparent dark:border-cyber-blue/50 px-4 md:px-8 py-2 rounded-xl text-sm md:text-base font-bold transition-all whitespace-nowrap shadow-lg hover:shadow-xl flex items-center justify-center"
                    >
                        <span className="hidden md:inline">전송</span>
                        <span className="md:hidden">➤</span>
                    </button>
                    <button 
                        onClick={handleGenerateReport}
                        disabled={loading}
                        className="bg-purple-100 hover:bg-purple-200 dark:bg-cyber-purple/20 dark:hover:bg-cyber-purple/30 text-purple-700 dark:text-cyber-purple border border-purple-200 dark:border-cyber-purple/50 px-4 md:px-6 py-2 rounded-xl text-sm md:text-base font-bold transition-all whitespace-nowrap flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <>
                                <span className="md:hidden">📑</span>
                                <span className="hidden md:inline">📑 리포트</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );

  const renderSettingsModal = () => (
      showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-white dark:bg-cyber-dark w-full max-w-md rounded-3xl shadow-2xl p-6 md:p-8 border border-gray-200 dark:border-white/10">
                <h3 className="text-2xl font-bold dark:text-white text-gray-900 mb-6">설정</h3>
                
                <div className="space-y-6">
                    {/* API Key Section */}
                    <div>
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Gemini API Key 설정</label>
                        <div className="flex gap-2 mb-2">
                            <input 
                                type="password" 
                                value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                                placeholder="API Key를 입력하세요"
                                className="flex-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-white text-gray-900 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleSaveApiKey}
                                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors shadow-md"
                            >
                                저장
                            </button>
                            <button 
                                onClick={handleDeleteApiKey}
                                className="flex-1 py-3 rounded-xl bg-red-100 hover:bg-red-200 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm transition-colors border border-red-200 dark:border-red-500/30"
                            >
                                삭제
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            * 입력된 키는 브라우저 세션 스토리지에만 저장됩니다.
                        </p>
                    </div>

                    <div className="border-t border-gray-200 dark:border-white/5 pt-4">
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">화면 모드</label>
                        <div className="flex gap-2">
                             <button 
                                onClick={() => setDarkMode(false)}
                                className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${!darkMode ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-white/5 dark:border-white/10 dark:text-gray-400'}`}
                             >
                                 라이트 모드
                             </button>
                             <button 
                                onClick={() => setDarkMode(true)}
                                className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${darkMode ? 'bg-blue-900/30 border-cyber-blue text-cyber-blue' : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-white/5 dark:border-white/10 dark:text-gray-400'}`}
                             >
                                 다크 모드
                             </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">데이터 관리</label>
                        <button 
                            onClick={handleClearHistory}
                            className="w-full py-3 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                        >
                            모든 기록 삭제
                        </button>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button 
                        onClick={() => setShowSettingsModal(false)}
                        className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-90 transition-opacity"
                    >
                        닫기
                    </button>
                </div>
             </div>
        </div>
      )
  );

  const renderReportModal = () => (
    showReportModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white dark:bg-cyber-dark w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-white/10">
          
          {/* Header */}
          <div className="flex justify-between items-center p-6 md:p-8 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
            <div>
                <h3 className="text-2xl font-bold dark:text-white text-gray-900 flex items-center gap-2">
                    <span className="text-purple-600 dark:text-cyber-purple">///</span> 전략 리포트
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI가 분석한 회의 요약 및 인사이트</p>
            </div>
            <button 
                onClick={() => setShowReportModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            >
                ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white dark:bg-cyber-black/50">
             <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-200">
                {summary || "리포트 내용이 없습니다."}
             </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex flex-col sm:flex-row justify-end gap-3">
             <button
                onClick={handleCopyReport}
                className="px-6 py-3 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
             >
                {isCopied ? '✅ 복사됨' : '📋 클립보드 복사'}
             </button>
             
             <button
                onClick={handleDownloadWebsite}
                disabled={websiteLoading}
                className="px-6 py-3 bg-purple-600 dark:bg-cyber-purple hover:bg-purple-700 dark:hover:bg-purple-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2"
             >
                {websiteLoading ? (
                    <>
                        <span className="animate-spin">⏳</span> 웹사이트 생성 중...
                    </>
                ) : (
                    <>
                        <span>🌐</span> 웹사이트로 저장
                    </>
                )}
             </button>
             
             <button
                onClick={() => setShowReportModal(false)}
                className="px-6 py-3 bg-gray-800 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-90 transition-opacity"
             >
                닫기
             </button>
          </div>
        </div>
      </div>
    )
  );

  return (
    <div className={`min-h-screen transition-colors duration-500 ${darkMode ? 'dark bg-cyber-black' : 'bg-paper'}`}>
      {viewMode === 'SETUP' && renderSetup()}
      {viewMode === 'SIMULATION' && renderRoom()}
      {viewMode === 'HISTORY' && (
         <div className="min-h-screen p-0 md:p-4 bg-paper dark:bg-cyber-black">
            <HistoryView 
                records={historyRecords}
                onLoadRecord={handleLoadRecord}
                onDeleteRecord={handleDeleteRecord}
                onBack={() => setViewMode('SETUP')}
            />
         </div>
      )}
      
      {/* Modals */}
      {renderSettingsModal()}
      {renderReportModal()}
      <GuideModal isOpen={showGuideModal} onClose={() => setShowGuideModal(false)} />
    </div>
  );
}