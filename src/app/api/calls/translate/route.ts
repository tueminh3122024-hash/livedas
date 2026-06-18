import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text, targetLang, voiceId } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Missing text to translate' }, { status: 400 });
    }

    // 1. Thực hiện dịch thuật bằng Gemini qua OpenRouter
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    let translatedText = text;

    const translationPrompt = `Bạn là phiên dịch viên nông nghiệp chuyên nghiệp. Hãy dịch câu nói sau sang ${
      targetLang === 'en' ? 'tiếng Anh chuẩn' : 'tiếng Việt phổ thông (chuẩn giọng Bắc)'
    }, đặc biệt lưu ý nếu có các tiếng lóng hay phương ngữ miền Tây Nam Bộ hoặc Tây Nguyên thì quy đổi chính xác theo ngữ cảnh sỉ nông sản:\n\n"${text}"`;

    if (openrouterApiKey) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openrouterApiKey}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Livedas Translation Engine',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'user', content: translationPrompt },
            ],
          }),
        });

        const data = await response.json();
        translatedText = data.choices?.[0]?.message?.content || text;
      } catch (err) {
        console.error('Error with OpenRouter translation:', err);
      }
    } else {
      // Fallback dịch thô cục bộ cho demo nếu thiếu API key
      if (targetLang === 'en') {
        translatedText = `[Demo EN] Wholesale price report: ${text}`;
      } else {
        translatedText = `[Dịch giọng Bắc] ${text.replace('tui', 'tôi').replace('bè', 'bè nuôi').replace('k', ' nghìn')}`;
      }
    }

    // 2. Chuyển đổi văn bản dịch thành giọng nói bằng ElevenLabs
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
    let audioBase64 = null;

    if (elevenlabsApiKey) {
      try {
        // Voice ID mặc định của ElevenLabs (hoặc tùy biến)
        const selectedVoice = voiceId || '21m00Tcm4TlvDq8ikWAM'; 
        const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': elevenlabsApiKey,
          },
          body: JSON.stringify({
            text: translatedText,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        });

        if (ttsResponse.ok) {
          const audioBuffer = await ttsResponse.arrayBuffer();
          audioBase64 = Buffer.from(audioBuffer).toString('base64');
        }
      } catch (err) {
        console.error('Error with ElevenLabs TTS:', err);
      }
    }

    return NextResponse.json({
      success: true,
      originalText: text,
      translatedText,
      audioBase64, // null nếu chạy demo hoặc lỗi ElevenLabs (phía client tự dùng Web Speech Synthesis)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
