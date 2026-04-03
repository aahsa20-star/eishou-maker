import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const rateLimit = new Map(); // key -> { count, resetAt }

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // JWT認証（サブスクライバー判定）
  let isSubscriber = false;
  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.eishou_token;
    if (token && process.env.JWT_SECRET) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      isSubscriber = !!payload.isSubscriber;
    }
  } catch {}

  // Rate limit
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const limitKey = `image_${ip}`;
  const limit = isSubscriber ? 30 : 3;
  const now = Date.now();
  const entry = rateLimit.get(limitKey);
  if (entry && now < entry.resetAt) {
    if (entry.count >= limit) {
      return res.status(429).json({
        error: isSubscriber
          ? '画像生成のレート制限中です。1時間に30回までです'
          : '画像生成のレート制限中です。1時間に3回までです',
        limit,
        remaining: 0
      });
    }
    entry.count++;
  } else {
    rateLimit.set(limitKey, { count: 1, resetAt: now + 3600000 });
  }

  // 残り回数を計算
  const currentEntry = rateLimit.get(limitKey);
  const remaining = Math.max(0, limit - (currentEntry ? currentEntry.count : 0));

  const { chantText, type, element } = req.body || {};
  if (!chantText) {
    return res.status(400).json({ error: '詠唱文が指定されていません' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!anthropicKey || !openaiKey) {
    return res.status(500).json({ error: 'APIキーが設定されていません' });
  }

  try {
    // Step1: Claude APIで詠唱文→英語画像プロンプト変換
    const promptRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `以下の詠唱文と属性情報をもとに、DALL-E 3用の英語画像プロンプトを1つだけ生成してください。
ファンタジーRPGの魔法陣・召喚シーンのイメージで、
ダークファンタジー・フリーレン風の神秘的な雰囲気にしてください。
人物は含めず、魔法のエフェクト・風景・オーラを中心にしてください。
プロンプトのみ出力してください（説明不要）。

詠唱文：${chantText.slice(0, 200)}
タイプ：${type || '召喚'}
属性：${element || 'なし'}`
        }]
      })
    });

    const promptData = await promptRes.json();
    if (promptData.error) {
      return res.status(502).json({ error: 'プロンプト生成に失敗: ' + (promptData.error.message || 'Anthropic APIエラー') });
    }
    const imagePrompt = promptData.content[0].text.trim();

    // Step2: DALL-E 3で画像生成
    const imageRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: imagePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      })
    });

    const imageData = await imageRes.json();
    if (imageData.error) {
      return res.status(502).json({ error: '画像生成に失敗: ' + (imageData.error.message || 'OpenAI APIエラー') });
    }

    return res.status(200).json({
      url: imageData.data[0].url,
      prompt: imagePrompt,
      remaining,
      limit
    });
  } catch (e) {
    return res.status(500).json({ error: '画像生成に失敗しました' });
  }
}
