const rateLimit = new Map(); // IP -> { count, resetAt }

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: 5 req/min per IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= 5) {
      return res.status(429).json({ error: 'レート制限中です。1分後に再試行してください' });
    }
    entry.count++;
  } else {
    rateLimit.set(ip, { count: 1, resetAt: now + 60000 });
  }

  // Validate
  const { words } = req.body || {};
  if (!Array.isArray(words) || words.length === 0 || words.length > 20) {
    return res.status(400).json({ error: '単語を1〜20個指定してください' });
  }
  const sanitized = words.map(w => String(w).slice(0, 20)).filter(Boolean);
  if (sanitized.length === 0) {
    return res.status(400).json({ error: '有効な単語がありません' });
  }

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
        system: `あなたは厨二病な詠唱文を生成する専門家です。
与えられた単語を必ず全て使い、それらを繋いでかっこいい召喚・解放・降臨系の詠唱文を1つ生成してください。
以下のルールを守ること：
- 3〜5文程度
- 「——」や「！」「よ」「せよ」など詠唱らしい語尾を使う
- 単語の意味より語感・リズムを優先してよい
- 日本語のみ
- 余計な説明は一切不要。詠唱文のみ出力すること`,
        messages: [{ role: 'user', content: `以下の単語を使って詠唱を生成してください：\n${sanitized.join('、')}` }]
      })
    });

    const data = await response.json();
    if (data.error) {
      return res.status(502).json({ error: data.error.message || 'Anthropic APIエラー' });
    }

    return res.status(200).json({ text: data.content[0].text });
  } catch (e) {
    return res.status(500).json({ error: '詠唱の生成に失敗しました' });
  }
}
