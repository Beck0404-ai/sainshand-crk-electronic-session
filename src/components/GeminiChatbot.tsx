import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Trash2, Bot, User, Copy, Check, ChevronDown, BookOpen, Scale, MessageSquareQuote, FileText } from 'lucide-react';
import { AppState } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface GeminiChatbotProps {
  appState: AppState | null;
  currentRole: 'admin' | 'delegate' | null;
}

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({ appState, currentRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const initialGreeting: Message = {
    id: 'welcome-msg',
    role: 'assistant',
    content: `Сайн байна уу! Би Сайншанд сумын Иргэдийн Төлөөлөгчдийн Хурлын албан ёсны **AI Ухаалаг Туслах Beck** байна. 🏛️✨\n\nТанд дараах чиглэлээр туслахад бэлэн байна:\n• Хэлэлцэх асуудлын материал, төслийг нэгтгэн дүгнэх\n• ИТХ-ын хуралдааны дэг, хууль эрх зүйн зөвлөгөө\n• Төлөөлөгчийн үг хэлэх санал, асуулт найруулах\n• Хуралдааны тогтоолын төсөл боловсруулах`,
    timestamp: Date.now()
  };

  const [messages, setMessages] = useState<Message[]>([initialGreeting]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build history excluding welcome message
      const history = newMessages
        .filter(m => m.id !== 'welcome-msg')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history
        })
      });

      if (!res.ok) {
        throw new Error('AI хариулахад алдаа гарлаа');
      }

      const data = await res.json();
      const botMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Уучлаарай, хариулт үүсгэх боломжгүй байна.',
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '⚠️ Уучлаарай, AI үйлчилгээтэй холбогдоход түр саатал гарлаа. Та дахин оролдоно уу.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([initialGreeting]);
  };

  const quickChips = [
    { label: '📑 Асуудлыг дүгнэх', prompt: 'Одоогийн хуралдаанаар хэлэлцэж буй гол асуудлыг товч бөгөөд ойлгомжтойгоор дүгнэж танилцуулна уу.' },
    { label: '⚖️ Хурлын дэг асуух', prompt: 'Сайншанд сумын ИТХ-ын хуралдааны дэгийн дагуу асуудал хэлэлцэх, санал хураах журам ямар байдаг вэ?' },
    { label: '🎤 Үг хэлэх санал бэлтгэх', prompt: 'Төлөөлөгчийн хувиар хэлэлцэж буй асуудалд оновчтой 2 асуулт, 1 санал найруулаад өгнө үү.' },
    { label: '📝 Тогтоолын төсөл', prompt: 'Энэхүү хэлэлцэж буй асуудлаар сумын ИТХ-ын албан ёсны тогтоолын төслийн бүтцийг загварчлан бичнэ үү.' }
  ];

  // Helper to format basic markdown (bold, lists, paragraphs)
  const renderFormattedText = (content: string) => {
    return content.split('\n').map((line, idx) => {
      // Check for bullet points
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('*') || line.trim().startsWith('-');
      const cleanLine = isBullet ? line.trim().replace(/^[•*-]\s*/, '') : line;

      // Simple regex for bold text **bold**
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const renderedLine = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-semibold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-2 my-0.5">
            <span className="text-blue-500 font-bold leading-relaxed">•</span>
            <span className="flex-1">{renderedLine}</span>
          </div>
        );
      }

      return <p key={idx} className="my-0.5 leading-relaxed">{renderedLine}</p>;
    });
  };

  return (
    <>
      {/* FLOATING ACTION BUTTON */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-full shadow-2xl hover:shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all duration-300 border border-blue-400/30"
            title="Сайншанд ИТХ-ын AI Ухаалаг Туслах Beck"
          >
            {/* Animated ping glow */}
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
            </span>

            <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:rotate-12 transition-transform">
              <Sparkles className="h-4 w-4 text-amber-300" />
            </div>

            <div className="text-left font-sans">
              <div className="text-xs font-bold tracking-wide flex items-center gap-1">
                <span>AI ТУСЛАХ BECK</span>
                <span className="text-[9px] bg-white/25 px-1.5 py-0.2 rounded font-mono uppercase">AI</span>
              </div>
              <div className="text-[9px] text-blue-100 opacity-90">Сайншанд ИТХ</div>
            </div>
          </button>
        )}
      </div>

      {/* CHATBOT DRAWER / MODAL */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[440px] h-[640px] max-h-[85vh] bg-white dark:bg-[#0c162d] rounded-3xl shadow-2xl border border-slate-200 dark:border-blue-900/60 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300 font-sans">
          
          {/* HEADER */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 p-4 text-white flex items-center justify-between border-b border-blue-800/40 relative">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md border border-blue-400/30">
                <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white tracking-wide">Сайншанд ИТХ • AI Туслах Beck</h3>
                  <span className="text-[8px] bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 px-1.5 py-0.5 rounded-full font-mono font-bold">
                    ONLINE
                  </span>
                </div>
                <p className="text-[10px] text-blue-200/80 font-mono">Beck AI Engine • Gemini Flash</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                className="p-1.5 text-blue-200/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                title="Чат түүх цэвэрлэх"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-blue-200/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                title="Хаах"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ACTIVE MEETING CONTEXT BADGE */}
          {appState?.meeting && (
            <div className="bg-blue-50 dark:bg-blue-950/40 px-3.5 py-1.5 border-b border-blue-100 dark:border-blue-900/30 text-[10px] flex items-center justify-between text-blue-700 dark:text-blue-300 font-mono">
              <span className="truncate max-w-[280px]">
                🏛️ {appState.meeting.title}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                Холбогдсон
              </span>
            </div>
          )}

          {/* MESSAGES LIST */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-slate-50/50 dark:bg-[#070e1e]">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div className={`h-7 w-7 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm ${
                    isUser
                      ? 'bg-blue-600'
                      : 'bg-gradient-to-br from-indigo-600 to-blue-700 border border-blue-400/30'
                  }`}>
                    {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-4 w-4 text-amber-200" />}
                  </div>

                  {/* Bubble */}
                  <div className={`relative group max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-md'
                      : 'bg-white dark:bg-blue-950/60 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/80 dark:border-blue-900/40 shadow-sm'
                  }`}>
                    <div className="break-words">
                      {renderFormattedText(msg.content)}
                    </div>

                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-black/5 dark:border-white/5 text-[9px] opacity-60 font-mono">
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      
                      {!isUser && msg.id !== 'welcome-msg' && (
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="hover:opacity-100 flex items-center gap-1 ml-2 text-blue-600 dark:text-blue-400"
                          title="Хуулах"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-500" />
                              <span className="text-emerald-500">Хуулсан</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Хуулах</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* TYPING INDICATOR */}
            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center flex-shrink-0 text-white border border-blue-400/30 shadow-sm">
                  <Bot className="h-4 w-4 text-amber-200" />
                </div>
                <div className="bg-white dark:bg-blue-950/60 rounded-2xl rounded-tl-none px-4 py-3 border border-slate-200/80 dark:border-blue-900/40 shadow-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-blue-300 font-mono">Beck тунгаан бодож байна...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* QUICK PROMPT CHIPS */}
          <div className="px-3 py-2 bg-white dark:bg-[#0c162d] border-t border-slate-100 dark:border-blue-900/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip.prompt)}
                disabled={isLoading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 hover:bg-blue-50 dark:bg-blue-950/80 dark:hover:bg-blue-900/60 text-slate-700 dark:text-blue-200 border border-slate-200 dark:border-blue-800/40 transition-colors disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* INPUT BAR */}
          <div className="p-3 bg-white dark:bg-[#0c162d] border-t border-slate-200/80 dark:border-blue-900/40">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Хуралдааны талаар асуултаа бичнэ үү..."
                disabled={isLoading}
                className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-blue-950/60 border border-slate-200 dark:border-blue-900/50 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="h-9 w-9 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all flex-shrink-0"
                title="Илгээх"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <div className="flex items-center justify-between mt-1.5 px-1 text-[8px] text-slate-400 dark:text-blue-400/60 font-mono">
              <span>Enter дарж илгээнэ</span>
              <span>Сайншанд сумын ИТХ • 2026</span>
            </div>
          </div>

        </div>
      )}
    </>
  );
};
