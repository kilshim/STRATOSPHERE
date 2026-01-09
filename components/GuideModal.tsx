import React from 'react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-cyber-dark w-full max-w-3xl max-h-[85vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-white/10">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
          <div>
            <h3 className="text-2xl font-bold dark:text-white text-gray-900 flex items-center gap-2">
              <span className="text-blue-500">?</span> 사용 가이드
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Stratosphere AI 100% 활용하기</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-white dark:bg-[#0f172a]">
          
          {/* Section 1: Intro */}
          <div className="space-y-3">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
              기본 설정 및 시작
            </h4>
            <div className="pl-8 text-gray-600 dark:text-gray-300 text-sm leading-relaxed space-y-2">
              <p>
                <strong>산업/분야</strong>(예: 핀테크, 카페 창업)와 <strong>전략 주제</strong>(예: 20대 타겟 마케팅)를 입력하고 <span className="text-blue-600 dark:text-blue-400 font-bold">'전략 회의 시작'</span> 버튼을 누르세요.
              </p>
              <p>
                AI가 주제에 가장 적합한 5명의 전문가 페르소나(CEO, 마케터, 개발자 등)를 자동으로 생성하여 회의실로 초대합니다.
              </p>
            </div>
          </div>

          {/* Section 2: Discussion */}
          <div className="space-y-3">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
              회의 진행 방식
            </h4>
            <div className="pl-8 text-gray-600 dark:text-gray-300 text-sm leading-relaxed space-y-2">
              <ul className="list-disc pl-4 space-y-1 marker:text-gray-400">
                <li>
                  <strong>자동 토론 모드:</strong> 상단이나 사이드바의 토글 스위치를 켜면(<span className="text-green-600 font-bold">ON</span>), 전문가들이 순서대로 의견을 주고받습니다.
                </li>
                <li>
                  <strong>수동 개입:</strong> 왼쪽 사이드바의 전문가 카드를 <strong>클릭</strong>하면 해당 전문가에게 즉시 발언을 요청할 수 있습니다.
                </li>
                <li>
                  <strong>사용자 참여:</strong> 하단 입력창에 의견을 적어 전송하면, 사용자가 '전략가'로서 회의에 개입하여 흐름을 바꿀 수 있습니다.
                </li>
              </ul>
            </div>
          </div>

          {/* Section 3: Output */}
          <div className="space-y-3">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
              결과물 생성
            </h4>
            <div className="pl-8 text-gray-600 dark:text-gray-300 text-sm leading-relaxed space-y-2">
              <p>
                대화가 충분히 진행되었다면 하단의 <span className="text-purple-600 dark:text-purple-400 font-bold">📑 리포트</span> 버튼을 누르세요.
              </p>
              <ul className="list-disc pl-4 space-y-1 marker:text-gray-400">
                <li><strong>전략 리포트:</strong> 핵심 통찰, 주요 쟁점, 결론이 담긴 요약본을 볼 수 있습니다.</li>
                <li><strong>웹사이트 저장:</strong> 리포트 화면에서 <span className="font-bold">🌐 웹사이트로 저장</span>을 누르면, 멋진 디자인의 원페이지 HTML 보고서 파일이 다운로드됩니다.</li>
              </ul>
            </div>
          </div>

          {/* Section 4: API Key */}
          <div className="space-y-3">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span>
              문제 해결 (API 오류)
            </h4>
            <div className="pl-8 text-gray-600 dark:text-gray-300 text-sm leading-relaxed space-y-2">
              <p className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-500/30">
                <span className="font-bold text-red-600 dark:text-red-400">주의:</span> "API 사용량이 초과되었습니다 (429)" 오류가 발생하면, 무료 제공량 한도에 도달한 것입니다.
              </p>
              <p>
                이 경우 <strong>설정(⚙️)</strong> 메뉴에서 본인의 <strong>Google Gemini API Key</strong>를 입력하면 제한 없이 계속 사용할 수 있습니다.
                (키는 브라우저에만 임시 저장되며 서버로 전송되지 않습니다.)
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
};