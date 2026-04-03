import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

// Upstash Redis REST API helper
async function redis(command) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const res = await fetch(`${url}/${command}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return (await res.json()).result;
}

async function checkRateLimit(key, limit, windowSeconds) {
  const current = parseInt(await redis(`get/${key}`)) || 0;

  if (current >= limit) {
    const ttl = await redis(`ttl/${key}`);
    return { allowed: false, remaining: 0, resetIn: Math.max(ttl, 0) };
  }

  const newCount = await redis(`incr/${key}`);
  if (newCount === 1) {
    await redis(`expire/${key}/${windowSeconds}`);
  }

  return { allowed: true, remaining: limit - newCount, resetIn: windowSeconds };
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // JWT認証（サブスクライバー判定）
  let isSubscriber = false;
  let userId = null;
  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.eishou_token;
    if (token && process.env.JWT_SECRET) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      isSubscriber = !!payload.isSubscriber;
      userId = payload.userId;
    }
  } catch {}

  // サブスクライバー限定
  if (!isSubscriber) {
    return res.status(403).json({ error: 'サブスクライバー限定機能です' });
  }

  // Rate limit（Upstash Redis）
  const rateLimitKey = `image:user:${userId}`;
  const limit = 5;
  const windowSeconds = 86400; // 24時間

  const rl = await checkRateLimit(rateLimitKey, limit, windowSeconds);
  if (!rl.allowed) {
    return res.status(429).json({
      error: `画像生成の上限に達しました。${Math.ceil(rl.resetIn / 3600)}時間後にリセットされます`,
      limit,
      remaining: 0,
      resetIn: rl.resetIn
    });
  }

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
      remaining: rl.remaining,
      limit,
      resetIn: rl.resetIn
    });
  } catch (e) {
    return res.status(500).json({ error: '画像生成に失敗しました' });
  }
}
