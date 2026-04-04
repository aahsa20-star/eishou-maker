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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // JWT認証（サブスクライバーのみ）
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

  if (!isSubscriber) {
    return res.status(403).json({ error: 'サブスクライバー限定機能です' });
  }

  // レートリミット（chantと同じ枠を共有）
  const rateLimitKey = `chant:user:${userId}`;
  const rl = await checkRateLimit(rateLimitKey, 20, 3600);
  if (!rl.allowed) {
    return res.status(429).json({
      error: '詠唱の刻が尽きた。時を待て',
      remaining: 0,
      resetIn: rl.resetIn
    });
  }

  // Validate
  const { chant1, chant2 } = req.body || {};
  if (!chant1 || !chant2 || typeof chant1 !== 'string' || typeof chant2 !== 'string') {
    return res.status(400).json({ error: '2つの詠唱が必要です' });
  }

  const sanitized1 = chant1.slice(0, 500).trim();
  const sanitized2 = chant2.slice(0, 500).trim();

  const evalBlock = `詠唱文を生成した後、改行して以下の形式で評価も出力すること：
EVAL:{"element":"闇","power":4,"rarity":"レア","type":"封印"}
elementは次から1つ：闇・光・炎・氷・雷・風・土・混沌・神聖・血・夢・虚無
powerは1〜5の整数（詠唱の力強さ・厨二度）
rarityは次から1つ：コモン・アンコモン・レア・スーパーレア・レジェンド
typeは次から1つ：召喚・解放・封印・滅亡・覚醒

属性の選び方：
- 詠唱文のキーワード・雰囲気・テーマから最も合う属性を1つ選ぶこと
- 「闇」や「光」を安易に選ばず、内容に最も近い属性を選ぶこと

レア度の選び方（確率の目安）：
- コモン：10%（短い詠唱の場合のみ）
- アンコモン：25%
- レア：35%
- スーパーレア：20%
- レジェンド：10%（特に独創的・印象的な詠唱の時）
融合詠唱は独創性が高いため、レア度は高めに設定すること。

EVAL:以降はJSONのみ出力すること`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'APIキーが設定されていません' });
  }

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
        max_tokens: 512,
        system: `あなたは厨二病な詠唱文を融合させる専門家です。
2つの詠唱のエッセンスを抽出し、新しい1つの詠唱に融合させてください。

ルール：
- 両方の詠唱の雰囲気・キーワードを自然に織り交ぜること
- 3〜5文程度
- 1文は40文字以内を目安にすること
- 各文は改行で区切ること（1行に1文）
- 「——」「！」「よ」「せよ」など詠唱らしい語尾を使う
- 元の詠唱の直接コピーは禁止。新しい詠唱を生み出すこと
- 日本語のみ
- 余計な説明は不要。詠唱文のみ出力すること
- ${evalBlock}`,
        messages: [{
          role: 'user',
          content: `以下の2つの詠唱を融合させて新しい詠唱を生成してください：\n\n詠唱1：\n${sanitized1}\n\n詠唱2：\n${sanitized2}`
        }]
      })
    });

    const data = await response.json();
    if (data.error) {
      return res.status(502).json({ error: data.error.message || 'Anthropic APIエラー' });
    }

    const raw = data.content[0].text;
    const evalMatch = raw.match(/EVAL:(\{.+\})/);
    let chantText = raw;
    let evaluation = null;
    if (evalMatch) {
      chantText = raw.split('\nEVAL:')[0].trim();
      try { evaluation = JSON.parse(evalMatch[1]); } catch {}
    }
    chantText = chantText.replace(/\\n/g, '\n');

    return res.status(200).json({
      text: chantText,
      evaluation,
      remaining: rl.remaining,
      limit: 20,
      resetIn: rl.resetIn
    });
  } catch (e) {
    return res.status(500).json({ error: '融合に失敗しました' });
  }
}
