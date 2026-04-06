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
  res.setHeader('Access-Control-Allow-Origin', 'https://eishou-maker.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // JWT認証（サブスクライバーのみ）
  let isSubscriber = false;
  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.eishou_token;
    if (token && process.env.JWT_SECRET) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      isSubscriber = !!payload.isSubscriber;
    }
  } catch {}
  if (!isSubscriber) {
    return res.status(403).json({ error: 'サブスクライバー限定機能です' });
  }

  // レートリミット（IPベース 10回/日）
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const rl = await checkRateLimit(`judge:ip:${ip}`, 10, 86400);
  if (!rl.allowed) {
    return res.status(429).json({ error: 'バトルの上限に達しました。明日また挑戦せよ' });
  }

  const { red, blue } = req.body || {};
  if (!red || !blue) {
    return res.status(400).json({ error: '両陣営の詠唱が必要です' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'APIキーが設定されていません' });
  }

  // バイアス対策：ランダムに提示順を決める
  const isSwapped = Math.random() > 0.5;
  const chantA = isSwapped ? blue : red;
  const chantB = isSwapped ? red : blue;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system: `あなたは厨二病な詠唱バトルの審判です。
2つの詠唱を「厨二度・迫力・独創性」の3観点で比較し勝者を判定してください。

重要：提示順序（AかBか）による偏りを排除すること。
Aが先に書かれているからといってAを優遇してはならない。
各観点で個別にどちらが優れているかを分析してから総合判定せよ。

以下のJSON形式のみで出力してください：
{"winner":"A","reason":"審判コメント"}

winnerは "A"、"B"、"draw" の3択。
両者が互角で甲乙つけがたい場合のみ "draw" にすること。

reasonは以下の構成で3〜5文で書くこと：
1. 勝者の優れた点（厨二度・迫力・独創性のどこが光ったか）
2. 具体的なフレーズや表現への言及（「〇〇という表現が」等）
3. 敗者の敗因（何が足りなかったか、惜しかった点）
4. 総評（バトル全体の印象・引き分けの場合は両者の違い）

審判自身も厨二病な口調で語ること。
例：「——その言霊の迫力、他の追随を許さぬ」「敗者よ、汝の詠唱は平凡の域を出ず」等
口調は厨二だが内容は具体的・論理的に。`,
        messages: [{
          role: 'user',
          content: `詠唱A：\n${chantA}\n\n詠唱B：\n${chantB}`
        }]
      })
    });

    const data = await response.json();
    if (data.error) {
      return res.status(502).json({ error: data.error.message || 'Anthropic APIエラー' });
    }

    const text = data.content[0].text.trim();
    // JSONを抽出（前後に余計なテキストがある場合に対応）
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: '審判の判定に失敗しました' });
    }

    const result = JSON.parse(jsonMatch[0]);
    let actualWinner;
    if (result.winner === 'draw') {
      actualWinner = 'draw';
    } else {
      actualWinner = isSwapped
        ? (result.winner === 'A' ? 'blue' : 'red')
        : (result.winner === 'A' ? 'red' : 'blue');
    }

    return res.json({
      winner: actualWinner,
      reason: result.reason || '',
      remaining: rl.remaining
    });
  } catch (e) {
    return res.status(500).json({ error: '審判の判定に失敗しました' });
  }
}
