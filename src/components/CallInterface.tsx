'use client';

import { useState, useEffect, useRef } from 'react';

interface CallInterfaceProps {
  roomUrl: string;
  sellerName: string;
  productId: string;
  onClose: (callLogId: string | null, outcome: string) => void;
  callLogId: string | null;
}

export default function CallInterface({
  roomUrl,
  sellerName,
  productId,
  onClose,
  callLogId
}: CallInterfaceProps) {
  const [translationActive, setTranslationActive] = useState(false);
  const [targetLang, setTargetLang] = useState<'vi_north' | 'en'>('vi_north');
  const [transcripts, setTranscripts] = useState<{ original: string; translated: string; time: string }[]>([]);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Khởi tạo Speech Recognition (Trực tiếp bằng trình duyệt Web Speech API)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = 'vi-VN'; // Lắng nghe tiếng Việt sỉ nông sản

        rec.onresult = async (event: any) => {
          const resultIndex = event.resultIndex;
          const text = event.results[resultIndex][0].transcript;
          
          if (text.trim()) {
            await handleNewSpeech(text);
          }
        };

        rec.onerror = (err: any) => {
          console.error('Speech recognition error:', err);
        };

        recognitionRef.current = rec;
      }
    }
  }, []);

  // Bật/tắt lắng nghe giọng nói để dịch
  useEffect(() => {
    if (translationActive && recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    } else if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (err) {
        // ignore
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch { /* ignore */ }
      }
    };
  }, [translationActive]);

  // Xử lý gửi text nhận dạng được lên API dịch & phát giọng nói ElevenLabs
  const handleNewSpeech = async (speechText: string) => {
    try {
      const res = await fetch('/api/calls/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: speechText,
          targetLang,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const newTranscript = {
          original: speechText,
          translated: data.translatedText,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        
        setTranscripts(prev => [newTranscript, ...prev]);

        // Phát giọng nói dịch thuật
        if (data.audioBase64) {
          // Play ElevenLabs audio
          const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
          audio.play();
        } else {
          // Play Web Speech synthesis fallback
          speakBrowser(data.translatedText, targetLang === 'en' ? 'en-US' : 'vi-VN');
        }
      }
    } catch (err) {
      console.error('Error translating call speech:', err);
    }
  };

  // Phát âm thanh dịch thô bằng trình duyệt
  const speakBrowser = (textToSpeak: string, langCode: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = langCode;
      window.speechSynthesis.speak(utterance);
    }
  };

  const endCall = (outcome: 'deal' | 'no_deal') => {
    onClose(callLogId, outcome);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/95 backdrop-blur-md">
      <div className="w-full max-w-5xl h-[92vh] md:h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-scaleIn">
        
        {/* Left column: Daily.co Call Iframe */}
        <div className="flex-[5] bg-slate-950 flex flex-col min-h-[45vh] md:min-h-0">
          
          {/* Header cuộc gọi */}
          <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center text-xs">
            <div>
              <span className="font-extrabold text-white text-sm">📞 Gọi trực tiếp: {sellerName}</span>
              <p className="text-[9px] sm:text-[10px] text-slate-400">WebRTC Call Session • Bảo mật</p>
            </div>
            
            {/* Status Indicator */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-[9px] sm:text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-slate-300">Trực tuyến</span>
            </div>
          </div>

          {/* WebRTC Video Room Iframe */}
          <div className="flex-1 relative bg-slate-950">
            <iframe
              src={roomUrl}
              allow="camera; microphone; fullscreen; display-capture"
              className="absolute inset-0 w-full h-full border-none"
            />
          </div>

          {/* Action Footer */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2.5 text-xs sm:p-4">
            <button
              onClick={() => endCall('no_deal')}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold transition-all text-slate-300 text-center"
            >
              Không Thỏa Thuận
            </button>
            <button
              onClick={() => endCall('deal')}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black transition-all text-center"
            >
              🤝 Chốt Đơn
            </button>
          </div>

        </div>

        {/* Right column: AI Translation Sidebar */}
        <div className="flex-[4] md:flex-none w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900 flex flex-col h-[40vh] md:h-full">
          
          {/* Title bar */}
          <div className="p-3 border-b border-slate-850 bg-slate-900/60 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">🎙️ Phiên dịch AI</h3>
              <p className="text-[9px] text-slate-500 mt-0.5">Dịch Gemini & ElevenLabs</p>
            </div>
            <span className="text-xs">🤖</span>
          </div>

          {/* Translation controls */}
          <div className="p-3 sm:p-4 border-b border-slate-850 bg-slate-950/20 flex flex-row md:flex-col items-center justify-between md:justify-start gap-4 md:space-y-3 text-xs">
            
            {/* Big Touch-Friendly Mic Button */}
            <div className="flex flex-col items-center justify-center flex-shrink-0">
              <button
                type="button"
                onClick={() => setTranslationActive(!translationActive)}
                className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                  translationActive
                    ? 'bg-cyan-500 text-slate-950 animate-pulse hover:bg-cyan-400 shadow-cyan-500/20'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 shadow-slate-950/40'
                }`}
                title={translationActive ? 'Tắt dịch giọng nói' : 'Bật dịch giọng nói'}
              >
                {translationActive ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-4.08A7 7 0 0 0 19 10Z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-6 sm:h-6">
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6"></path>
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                )}
              </button>
              <span className="text-[8px] font-bold mt-1 text-slate-400 text-center tracking-wider">
                {translationActive ? 'DỊCH: BẬT' : 'DỊCH: TẮT'}
              </span>
            </div>

            {/* Select target language & status */}
            <div className="flex-1 space-y-2 w-full">
              <div>
                <label className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">Ngôn ngữ đích</label>
                <select
                  value={targetLang}
                  onChange={e => setTargetLang(e.target.value as any)}
                  disabled={!translationActive}
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 disabled:opacity-50 text-[10px]"
                >
                  <option value="vi_north">Giọng Bắc (Hà Nội)</option>
                  <option value="en">English (US)</option>
                </select>
              </div>

              {/* Mic Indicator */}
              {isListening ? (
                <div className="flex items-center gap-1.5 text-[9px] text-cyan-400 animate-pulse font-bold">
                  <span className="w-1 h-1 rounded-full bg-cyan-400" />
                  Đang lắng nghe... Nói đi bro!
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold">
                  <span className="w-1 h-1 rounded-full bg-slate-700" />
                  Micro đang tắt
                </div>
              )}
            </div>

          </div>

          {/* Transcripts Stream list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/40">
            {transcripts.length > 0 ? (
              transcripts.map((t, idx) => (
                <div key={idx} className="space-y-1 animate-fadeIn text-xs border-b border-slate-800/40 pb-3">
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>{t.time}</span>
                    <span className="font-bold">GỐC (VI)</span>
                  </div>
                  <p className="text-slate-400">{t.original}</p>
                  
                  <div className="text-[9px] text-cyan-500 font-bold mt-1">DỊCH ({targetLang.toUpperCase()})</div>
                  <p className="text-cyan-400 font-bold">{t.translated}</p>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-600 text-xs p-4">
                <span className="text-2xl mb-1">🎙️</span>
                <p>Nhấp nút tròn microphone để bắt đầu dịch giọng nói song song cuộc gọi!</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
