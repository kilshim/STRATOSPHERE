import React from 'react';
import { MeetingRecord } from '../types';

interface HistoryViewProps {
  records: MeetingRecord[];
  onLoadRecord: (record: MeetingRecord) => void;
  onDeleteRecord: (id: string) => void;
  onBack: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ records, onLoadRecord, onDeleteRecord, onBack }) => {
  
  const handleExport = () => {
    // txt 파일로 변경하고 가독성을 위해 들여쓰기 적용
    const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `stratosphere_backup_${new Date().toISOString().slice(0,10)}.txt`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
        <h2 className="text-xl md:text-2xl font-mono text-gray-900 dark:text-white tracking-widest uppercase flex items-center gap-2">
          <span className="text-purple-600 dark:text-cyber-purple">///</span> 전략 아카이브
        </h2>
        <div className="flex w-full md:w-auto gap-2">
            <button
            onClick={handleExport}
            className="flex-1 md:flex-none px-4 py-2.5 bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-600/30 text-sm transition-colors font-bold flex items-center justify-center gap-2"
            >
            <span>💾</span> <span className="hidden sm:inline">백업 저장</span><span className="sm:hidden">저장</span>
            </button>
            <button
            onClick={onBack}
            className="flex-1 md:flex-none px-4 py-2.5 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-sm transition-colors flex items-center justify-center font-medium"
            >
            메인으로
            </button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="text-center p-12 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-white/5">
          <p className="text-gray-500 dark:text-gray-400 mb-2">저장된 회의 기록이 없습니다.</p>
          <p className="text-xs text-gray-400 dark:text-gray-600">회의를 진행하고 리포트를 생성하면 이곳에 저장됩니다.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {records.slice().reverse().map((record) => (
            <div
              key={record.id}
              className="glass-panel p-5 md:p-6 rounded-xl relative group transition-all hover:border-blue-400 dark:hover:border-cyber-blue/50 hover:shadow-lg bg-white dark:bg-transparent"
            >
              <div
                  onClick={() => onLoadRecord(record)}
                  className="cursor-pointer"
              >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-black/20 px-2 py-1 rounded">
                      {new Date(record.date).toLocaleDateString('ko-KR')}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-cyber-blue/10 text-blue-600 dark:text-cyber-blue border border-blue-100 dark:border-cyber-blue/20 font-bold">
                      {record.industry}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-cyber-blue transition-colors line-clamp-1 pr-8">
                    {record.topic}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 h-10 leading-relaxed">
                    {record.summary ? record.summary : "요약 정보가 없습니다."}
                  </p>
                  <div className="flex gap-1.5 pt-2 border-t border-gray-100 dark:border-white/5">
                    {record.personas.map(p => (
                      <div 
                        key={p.id} 
                        className="w-2.5 h-2.5 rounded-full ring-1 ring-gray-200 dark:ring-white/10" 
                        style={{ backgroundColor: p.color }}
                        title={p.role} 
                      />
                    ))}
                  </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => {
                    e.stopPropagation();
                    if(window.confirm('정말 이 회의 기록을 삭제하시겠습니까?')) onDeleteRecord(record.id);
                }}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors z-10"
                title="기록 삭제"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};