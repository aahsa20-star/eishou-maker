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

  // Rate limit（Upstash Redis）
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const rateLimitKey = userId ? `chant:user:${userId}` : `chant:ip:${ip}`;
  const limit = isSubscriber ? 20 : 2;
  const windowSeconds = isSubscriber ? 3600 : 86400;

  const rl = await checkRateLimit(rateLimitKey, limit, windowSeconds);
  if (!rl.allowed) {
    return res.status(429).json({
      error: isSubscriber
        ? 'レート制限中です。1時間に20回までです'
        : 'レート制限中です。1日に2回までです',
      limit,
      remaining: 0,
      resetIn: rl.resetIn
    });
  }

  // Validate
  const { words, type, profile, mode } = req.body || {};
  const validTypes = ['召喚', '解放', '封印', '滅亡', '覚醒', '自己紹介'];
  const chantType = validTypes.includes(type) ? type : '召喚';
  const isIntro = chantType === '自己紹介';
  const isProfileMode = isIntro && mode === 'profile';

  let sanitized = [];
  let systemPrompt = '';
  let userMessage = '';

  // EVAL共通テンプレート
  const evalBlock = `詠唱文を生成した後、改行して以下の形式で評価も出力すること：
EVAL:{"element":"闇","power":4,"rarity":"レア"}
elementは次から1つ：闇・光・炎・氷・雷・風・土・混沌・神聖・血・夢・虚無
powerは1〜5の整数（詠唱の力強さ・厨二度）
rarityは次から1つ：コモン・アンコモン・レア・スーパーレア・レジェンド

属性の選び方：
- 詠唱文のキーワード・雰囲気・テーマから最も合う属性を1つ選ぶこと
- 「闇」や「光」を安易に選ばず、内容に最も近い属性を選ぶこと
- 例：肉体・強さ・戦いの詠唱 → 「血」か「炎」
- 例：記憶・過去・夢の詠唱 → 「夢」か「風」
- 例：封印・束縛・呪いの詠唱 → 「土」か「虚無」
- 例：解放・自由・覚醒の詠唱 → 「光」か「雷」

レア度の選び方（確率の目安）：
- コモン：10%（入力が少なく短い詠唱の場合のみ）
- アンコモン：25%
- レア：35%
- スーパーレア：20%
- レジェンド：10%（特に独創的・印象的な詠唱の時）
入力が多いほど・詠唱が長いほど・独創的なほどレア度を上げること。

EVAL:以降はJSONのみ出力すること`;

  if (isProfileMode) {
    // 自己紹介プロフィールモード
    if (!profile || !profile.name || typeof profile.name !== 'string' || !profile.name.trim()) {
      return res.status(400).json({ error: '名前を入力してください' });
    }
    const p = {
      name: String(profile.name).slice(0, 30).trim(),
      activity: String(profile.activity || '').slice(0, 60).trim(),
      strength: String(profile.strength || '').slice(0, 60).trim(),
      keywords: String(profile.keywords || '').slice(0, 60).trim()
    };
    sanitized = [p.name];

    systemPrompt = `あなたは厨二病な自己紹介文を生成する専門家です。
与えられたプロフィール情報をもとに、その人物を神秘的・英雄的に表現した自己紹介文を生成してください。

ルール：
- 3〜5文程度
- 1文は40文字以内を目安にすること
- 各文は改行で区切ること（1行に1文）
- 「——」「！」「よ」「せよ」「者よ」など詠唱らしい語尾を使う
- 名前・活動・強みを自然に織り込む
- 一人称は「我」または「この身」
- 日本語のみ
- 余計な説明は不要。自己紹介文のみ出力すること
- ${evalBlock}`;

    const parts = [`名前：${p.name}`];
    if (p.activity) parts.push(`活動内容：${p.activity}`);
    if (p.strength) parts.push(`得意なこと：${p.strength}`);
    if (p.keywords) parts.push(`好きなもの：${p.keywords}`);
    userMessage = `以下のプロフィールから厨二病な自己紹介文を生成してください：\n${parts.join('\n')}`;

  } else {
    // 通常の詠唱タイプ ＋ 自己紹介言霊モード（どちらもwordsを使う）
    if (!Array.isArray(words) || words.length === 0 || words.length > 20) {
      return res.status(400).json({ error: '単語を1〜20個指定してください' });
    }
    sanitized = words.map(w => String(w).slice(0, 20)).filter(Boolean);
    if (sanitized.length === 0) {
      return res.status(400).json({ error: '有効な単語がありません' });
    }

    if (isIntro) {
      // 自己紹介言霊モード
      systemPrompt = `あなたは厨二病な自己紹介文を生成する専門家です。
与えられた単語を必ず全て使い、その人物の自己紹介として読める厨二病な文章を1つ生成してください。

ルール：
- 3〜5文程度
- 1文は40文字以内を目安にすること
- 各文は改行で区切ること（1行に1文）
- 一人称は「我」または「この身」
- 「——」「！」「よ」「せよ」「者よ」など詠唱らしい語尾を使う
- 単語を自然に自己紹介の文脈に織り込む
- 日本語のみ
- 余計な説明不要。自己紹介文のみ出力すること
- ${evalBlock}`;

      userMessage = `以下の単語を使って厨二病な自己紹介文を生成してください：\n${sanitized.join('、')}`;

    } else {
      // 通常の詠唱タイプ
      systemPrompt = `あなたは厨二病な詠唱文を生成する専門家です。
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
- ${evalBlock}`;

      userMessage = `以下の単語を使って詠唱を生成してください：\n${sanitized.join('、')}`;
    }
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
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
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
    return res.status(200).json({
      text: chantText,
      evaluation,
      remaining: rl.remaining,
      limit,
      resetIn: rl.resetIn
    });
  } catch (e) {
    return res.status(500).json({ error: '詠唱の生成に失敗しました' });
  }
}
