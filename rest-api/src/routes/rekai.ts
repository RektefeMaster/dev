import { Router } from 'express';
import OpenAI from 'openai';
import { getRekaiSystemPrompt } from './prompts/rekai';

const router = Router();

// API anahtarını kontrol et
const apiKey = process.env.REKAI_API_KEY;
console.log('REKAI Route - API Key:', apiKey ? 'Mevcut' : 'Eksik');

if (!apiKey) {
  console.error('REKAI API anahtarı bulunamadı!');
}

const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://openrouter.ai/api/v1"
});

router.post('/rekai/chat', async (req, res) => {
  try {
    const { userId, message, vehicle } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ 
        error: 'Eksik parametreler!',
        details: {
          userId: !userId ? 'Kullanıcı ID eksik' : null,
          message: !message ? 'Mesaj eksik' : null
        }
      });
    }

    const systemMessage = getRekaiSystemPrompt(vehicle);

    const completion = await openai.chat.completions.create(
      {
        model: "openai/gpt-4o",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      },
      {
        headers: {
          // İstersen buraya referer ve başlık ekleyebilirsin
          // "HTTP-Referer": "https://seninsiten.com",
          // "X-Title": "Senin Site İsmin"
        }
      }
    );

    const reply = completion.choices[0]?.message?.content || 'Üzgünüm, şu anda yanıt veremiyorum.';

    res.json({ 
      reply,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('REKAI API Hatası:', error);
    res.status(500).json({ 
      error: 'Sunucu hatası',
      details: error?.message || 'Bilinmeyen bir hata oluştu'
    });
  }
});

export default router; 