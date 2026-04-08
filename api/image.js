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

  const { chantText, type, element, words, profile } = req.body || {};
  if (!chantText) {
    return res.status(400).json({ error: '詠唱文が指定されていません' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!anthropicKey || !openaiKey) {
    return res.status(500).json({ error: 'APIキーが設定されていません' });
  }

  // タイプ別・プロフィール対応のシステムプロンプト
  let systemPrompt = `あなたはダークファンタジーアニメ風のイラスト生成AIへのプロンプトを作成する専門家です。
与えられた詠唱文・タイプ・キーワードから、DALL-E 3用の英語プロンプトを1つだけ生成してください。

必ず以下のスタイル指定を含めること：
- dark fantasy anime illustration style
- dramatic lighting and cinematic composition
- highly detailed
- no text, no words, no letters, no writing

タイプ別の方向性：
- 召喚：召喚された強大な存在・精霊・モンスター。魔法陣と共に次元の裂け目から現れる瞬間
- 解放：束縛から解き放たれた力の爆発。鎖が砕ける瞬間・解放されたエネルギーの奔流
- 封印：古の存在が封印される瞬間。神秘的な光の鎖・結界・古代の紋章
- 滅亡：終末の使者・崩壊する世界・破滅をもたらす存在の降臨
- 覚醒：戦士や術者の覚醒変容の瞬間。オーラの爆発・力の解放・超越の瞬間
- 自己紹介：その人物を体現したファンタジーキャラクターのポートレート。配信者・クリエイターとしての個性を反映した、ドラマチックなポーズと衣装
- 自動：詠唱文の内容・雰囲気から最も合うダークファンタジーシーンを選ぶ

プロンプトは英語で200〜300語程度。
余計な説明は不要。プロンプト文のみ出力すること。`;

  if (type === '自己紹介' && profile) {
    systemPrompt += `\n\n自己紹介タイプの追加指示：
実在の人物名は使わず「a powerful creator character」のように表現すること。
その人物の活動・強み・キーワードから性格・スタイルを読み取りファンタジーキャラクターとして昇華させること。
ポートレート構図（上半身〜全身）で、印象的なキャラクターデザインに。`;
  }

  const wordList = (words || []).join('、');
  const profileInfo = profile
    ? `名前：${profile.name || ''}、活動：${profile.activity || ''}、強み：${profile.strength || ''}、キーワード：${profile.keywords || ''}`
    : null;

  const userMessage = `詠唱タイプ：${type || '自動'}
詠唱文：${chantText.slice(0, 300)}
属性：${element || 'なし'}
${wordList ? `使用単語：${wordList}` : ''}
${profileInfo ? `プロフィール：${profileInfo}` : ''}`.trim();

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
        max_tokens: 500,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: userMessage
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
