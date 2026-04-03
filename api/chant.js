const rateLimit = new Map(); // IP -> { count, resetAt }

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= 5) {
      return res.status(429).json({ error: 'レート制限中です。1時間に5回までです' });
    }
    entry.count++;
  } else {
    rateLimit.set(ip, { count: 1, resetAt: now + 3600000 });
  }

  // Validate
  const { words, type } = req.body || {};
  const validTypes = ['召喚', '解放', '封印', '滅亡', '覚醒'];
  const chantType = validTypes.includes(type) ? type : '召喚';
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
与えられた単語を必ず全て使い、「${chantType}」タイプの詠唱文を1つ生成してください。
${({
  '召喚': 'トーン：強大な存在を呼び出す詠唱。威圧感と高揚感に満ちた、召喚の儀式のような荘厳さで。',
  '解放': 'トーン：封じられた力が解き放たれる詠唱。爆発的な開放感、枷が砕ける激しさで。',
  '封印': 'トーン：力を閉じ込める詠唱。重厚な静寂、呪いのような厳かさ、鎖が絡みつく雰囲気で。',
  '滅亡': 'トーン：すべてが終わりを迎える詠唱。絶望と諦観、壮大な終末感で。',
  '覚醒': 'トーン：眠れる力が目覚める詠唱。静かな始まりから徐々に高まる覚醒感で。',
})[chantType]}
以下のルールを守ること：
- 3〜5文程度
- 1文は40文字以内を目安にすること
- 各文は改行で区切ること（1行に1文）
- 「——」や「！」「よ」「せよ」など詠唱らしい語尾を使う
- 単語の意味より語感・リズムを優先してよい
- 日本語のみ
- 余計な説明は一切不要
- 詠唱文を生成した後、改行して以下の形式で評価も出力すること：
EVAL:{"element":"闇","power":4,"rarity":"レア"}
elementは次から1つ：闇・光・炎・氷・雷・風・土・無・混沌・神聖
powerは1〜5の整数（詠唱の力強さ・厨二度）
rarityは次から1つ：コモン・アンコモン・レア・スーパーレア・レジェンド
EVAL:以降はJSONのみ出力すること`,
        messages: [{ role: 'user', content: `以下の単語を使って詠唱を生成してください：\n${sanitized.join('、')}` }]
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
    // リテラル \n を実際の改行に変換
    chantText = chantText.replace(/\\n/g, '\n');
    return res.status(200).json({ text: chantText, evaluation });
  } catch (e) {
    return res.status(500).json({ error: '詠唱の生成に失敗しました' });
  }
}
