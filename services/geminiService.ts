import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Persona, Message } from "../types";

// Helper to get client
const getClient = () => {
  // Check for manually set API key in session storage first
  if (typeof window !== 'undefined') {
    const sessionKey = sessionStorage.getItem('gemini_api_key');
    if (sessionKey) {
      return new GoogleGenAI({ apiKey: sessionKey });
    }
  }

  // Fallback to environment variable
  const apiKey = process.env.API_KEY;
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper with exponential backoff
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 2, baseDelay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Check various error structures for 429/Quota limits
    const isQuotaError = 
        error?.status === 429 || 
        error?.code === 429 || 
        error?.error?.code === 429 || 
        error?.error?.status === 'RESOURCE_EXHAUSTED' ||
        (error?.message && (
            error.message.includes('429') || 
            error.message.includes('Quota') || 
            error.message.includes('RESOURCE_EXHAUSTED')
        ));
    
    if (isQuotaError && retries > 0) {
      console.warn(`Quota exceeded/Rate limit hit. Retrying in ${baseDelay}ms... (${retries} attempts left)`);
      await delay(baseDelay);
      return retryWithBackoff(fn, retries - 1, baseDelay * 2);
    }
    throw error;
  }
}

// Fallback comments for simulation when API fails
const FALLBACK_COMMENTS = [
  "이 점에 대해서는 추가적인 논의가 필요해 보입니다. 리스크를 다시 점검해봅시다.",
  "흥미로운 관점이군요. 하지만 데이터가 뒷받침되어야 합니다.",
  "시장의 반응을 예상해보면, 긍정적인 신호가 보입니다만 신중해야 합니다.",
  "경쟁사와의 차별화 포인트가 무엇인지 다시 한번 명확히 해야 합니다.",
  "비용 대비 효율성을 따져봐야 할 시점입니다. 예산 범위 내인가요?",
  "사용자 경험(UX) 관점에서는 이 전략이 어떻게 받아들여질까요?",
  "기술적인 구현 가능성도 검토가 필요합니다. 일정 내에 가능할까요?",
  "장기적인 로드맵과 부합하는지 확인해봅시다.",
  "지금의 방향성이 우리 브랜드 이미지와 맞는지 의문입니다.",
  "매우 혁신적인 접근이네요. 구체적인 실행 방안을 만들어봅시다.",
  "규제나 법적인 이슈는 없을지 미리 확인하는 것이 좋겠습니다.",
  "타겟 고객층의 니즈를 정확히 파악한 것인지 재검토가 필요합니다.",
  "초기 진입 장벽을 어떻게 낮출 수 있을지 고민해봐야 합니다.",
  "수익 모델이 지속 가능한지 냉정하게 평가해봅시다.",
  "글로벌 시장 확장 가능성도 염두에 두어야 할까요?",
  "현재 팀의 역량으로 소화 가능한 범위인지 확인 부탁드립니다.",
  "마케팅 채널을 어떻게 가져갈지에 대한 구체안이 필요합니다.",
  "고객의 피드백을 어떻게 수집하고 반영할지 프로세스가 있어야 합니다.",
  "예상치 못한 변수에 대한 대응 시나리오(Plan B)는 무엇인가요?",
  "이 전략이 회사의 핵심 가치와 일치하는지 점검해봅시다."
];

// Smart fallback that avoids repeating recent messages
const getSmartFallback = (history: Message[]) => {
  // Get last 10 messages text to avoid immediate repetition
  const recentTexts = new Set(history.slice(-10).map(m => m.text.trim()));
  const available = FALLBACK_COMMENTS.filter(c => !recentTexts.has(c));
  const candidates = available.length > 0 ? available : FALLBACK_COMMENTS;
  return candidates[Math.floor(Math.random() * candidates.length)];
};

// --- Models ---
// Primary: Gemini 3 Pro (High Quality)
const MODEL_PRO = "gemini-3-pro-preview";
// Secondary: Gemini 3 Flash (High Speed/Backup)
const MODEL_FLASH = "gemini-3-flash-preview";

export const generatePersonas = async (industry: string, topic: string): Promise<Persona[]> => {
  const ai = getClient();
  
  const prompt = `
    "${industry}" 산업의 "${topic}"에 관한 전략 회의를 위해 5명의 뚜렷하고 전문적인 AI 페르소나를 한국어로 생성해 주세요.
    마케팅, 재무, 기술/R&D, 운영, 그리고 와일드카드/비전가와 같은 역할을 포함해야 합니다.
    각 페르소나는 독특한 한국 이름, 구체적인 전문 직책, 뚜렷한 성격(예: 위험 회피형, 비전 제시형, 회의적 등), 그리고 색상 테마(hex 코드)를 가져야 합니다.
  `;

  const config = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          role: { type: Type.STRING },
          name: { type: Type.STRING },
          personality: { type: Type.STRING },
          color: { type: Type.STRING },
          avatarInitial: { type: Type.STRING },
        },
        required: ["role", "name", "personality", "color", "avatarInitial"]
      }
    }
  };

  try {
    // 1. Try Gemini 3 Pro
    const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
      model: MODEL_PRO,
      contents: prompt,
      config: config
    }));
    const rawData = response.text;
    if (!rawData) throw new Error("No data returned");
    const parsedData = JSON.parse(rawData);
    return parsedData.map((p: any, index: number) => ({ ...p, id: `persona-${index}` }));

  } catch (error) {
    console.warn("Pro model failed for Personas, falling back to Flash:", error);
    try {
        // 2. Fallback to Gemini 3 Flash
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: MODEL_FLASH,
            contents: prompt,
            config: config
        }));
        const rawData = response.text;
        if (!rawData) throw new Error("No data returned");
        const parsedData = JSON.parse(rawData);
        return parsedData.map((p: any, index: number) => ({ ...p, id: `persona-${index}` }));
    } catch (fallbackError) {
        console.warn("All models failed for Personas, using hardcoded fallback:", fallbackError);
        // 3. Hardcoded Fallback
        return [
            { id: 'persona-0', role: '전략 기획 팀장', name: '김철수', personality: '분석적', color: '#3b82f6', avatarInitial: '김' },
            { id: 'persona-1', role: '크리에이티브 디렉터', name: '이미영', personality: '표현력 풍부', color: '#ec4899', avatarInitial: '이' },
            { id: 'persona-2', role: '재무 이사', name: '박준호', personality: '보수적', color: '#10b981', avatarInitial: '박' },
            { id: 'persona-3', role: '기술 CTO', name: '최지훈', personality: '혁신적', color: '#8b5cf6', avatarInitial: '최' },
            { id: 'persona-4', role: '소비자 인사이트 전문가', name: '정수진', personality: '공감적', color: '#f59e0b', avatarInitial: '정' },
        ];
    }
  }
};

export const generateNextTurn = async (
  topic: string,
  history: Message[],
  personas: Persona[],
  nextSpeakerId: string
): Promise<string> => {
  const ai = getClient();
  const speaker = personas.find(p => p.id === nextSpeakerId);
  if (!speaker) return "...";

  const contextMessages = history.slice(-10).map(m => {
    const sender = personas.find(p => p.id === m.senderId)?.name || "진행자";
    return `${sender}: ${m.text}`;
  }).join("\n");

  const prompt = `
    시뮬레이션: "${topic}"에 대한 전략 회의.
    현재 발언자: ${speaker.name} (${speaker.role}).
    성격: ${speaker.personality}.
    
    최근 대화 기록:
    ${contextMessages}

    지시사항:
    ${speaker.name}의 관점에서 짧고 날카로우며 통찰력 있는 의견(최대 2~3문장)을 한국어로 작성하세요.
    이전 요점에 반응하거나 자신의 역할에 기반한 새로운 시각을 제시하세요.
    전문적이면서도 대화체로 작성하세요. 출력물에 "발언자:"와 같은 접두사를 사용하지 마세요.
  `;

  try {
    // 1. Try Gemini 3 Pro
    const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
      model: MODEL_PRO, 
      contents: prompt,
    }));
    const text = response.text;
    if (!text) throw new Error("AI returned empty response");
    
    const lastMessage = history[history.length - 1];
    if (lastMessage && text.trim() === lastMessage.text.trim()) throw new Error("Duplicate response detected");
    return text;

  } catch (error) {
    console.warn("Pro model failed for Turn, falling back to Flash:", error);
    try {
        // 2. Fallback to Gemini 3 Flash
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: MODEL_FLASH,
            contents: prompt,
        }));
        const text = response.text;
        if (!text) throw new Error("AI returned empty response");

        const lastMessage = history[history.length - 1];
        if (lastMessage && text.trim() === lastMessage.text.trim()) throw new Error("Duplicate response detected");
        return text;
    } catch (fallbackError) {
         console.warn("All models failed for Turn, using Smart Fallback:", fallbackError);
         // 3. Smart Fallback
         return getSmartFallback(history);
    }
  }
};

export const generateSummary = async (topic: string, history: Message[], personas: Persona[]): Promise<string> => {
  const ai = getClient();
  
  const fullTranscript = history.map(m => {
    const sender = personas.find(p => p.id === m.senderId)?.name || "시스템";
    return `${sender}: ${m.text}`;
  }).join("\n");

  const prompt = `
    "${topic}"에 대한 다음 전략 회의 기록을 분석하세요.
    
    대화 기록:
    ${fullTranscript}

    출력:
    마크다운(Markdown) 형식을 사용하여 구조화된 임원용 요약 보고서를 한국어로 작성하세요.
    다음 내용을 포함해야 합니다:
    1. 핵심 통찰 (글머리 기호)
    2. 주요 쟁점 및 갈등 요소
    3. 합의된 내용 또는 결론
    4. 권장되는 다음 단계
  `;

  try {
    // 1. Try Gemini 3 Pro
    const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
      model: MODEL_PRO,
      contents: prompt,
    }));
    return response.text || "요약 생성에 실패했습니다.";
  } catch (error) {
    console.warn("Pro model failed for Summary, falling back to Flash:", error);
    try {
        // 2. Fallback to Gemini 3 Flash
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: MODEL_FLASH,
            contents: prompt,
        }));
        return response.text || "요약 생성에 실패했습니다.";
    } catch (fallbackError) {
        return `### ⚠️ 요약 생성 실패\n\n모든 AI 모델 연결에 실패했습니다. (API 할당량 초과 가능성)\n\n잠시 후 다시 시도하거나 설정에서 API Key를 확인해주세요.`;
    }
  }
};

export const generateWebsiteContent = async (topic: string, summary: string): Promise<string> => {
  const ai = getClient();
  const prompt = `
    다음 전략 보고서 요약을 바탕으로, 모던하고 전문적인 원페이지 HTML 웹사이트 코드를 작성해줘.
    
    주제: ${topic}
    내용: ${summary}

    요구사항:
    1. Tailwind CSS CDN을 포함하여 스타일링할 것. (<script src="https://cdn.tailwindcss.com"></script>)
    2. 디자인 테마: **반드시 깔끔하고 신뢰감을 주는 '라이트 모드(Light Mode)'로 디자인할 것.**
       - 배경: 흰색(#ffffff) 또는 매우 밝은 회색(#f9fafb).
       - 텍스트: 가독성 높은 짙은 회색(#111827) 및 검정색.
       - 강조 색상: 전문적인 딥 블루(#2563eb) 또는 인디고(#4f46e5).
       - 그림자: 부드럽고 은은한 그림자 효과(shadow-lg, shadow-sm 등) 사용.
       - 전반적으로 인쇄물 보고서처럼 깔끔하고 정돈된 비즈니스 스타일 지향.
    3. 구조:
       - 헤더: 주제 및 "Strategic Report" 타이틀. (흰색 배경, 하단 경계선)
       - Hero 섹션: 주제를 명확히 보여주는 섹션 (밝은 배경에 굵은 타이포그래피).
       - 본문 섹션: 요약 내용을 기반으로 '핵심 통찰', '주요 쟁점', '결론', '다음 단계'를 카드 형태나 섹션으로 구분하여 시각화.
       - 아이콘이나 시각적 요소(이모지 등)를 적절히 활용하여 정보 전달력 강화.
       - 푸터: "Generated by Stratosphere AI" (심플한 회색 톤)
    4. 폰트: 한글 폰트(Pretendard 등) CDN 링크 포함 및 적용.
    5. 응답은 오직 실행 가능한 HTML 소스코드만 반환할 것. (마크다운 코드 블록 (\`\`\`html)을 포함하지 말 것, 순수 텍스트로 시작할 것)
  `;

  try {
     // 1. Try Gemini 3 Pro
    const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_PRO,
        contents: prompt,
    }));
    let html = response.text || "";
    html = html.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');
    return html;
  } catch (error) {
    console.warn("Pro model failed for Website, falling back to Flash:", error);
    try {
         // 2. Fallback to Gemini 3 Flash
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: MODEL_FLASH,
            contents: prompt,
        }));
        let html = response.text || "";
        html = html.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');
        return html;
    } catch (fallbackError) {
        console.error("Website generation failed entirely:", fallbackError);
        throw fallbackError;
    }
  }
};