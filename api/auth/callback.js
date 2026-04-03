import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('認証コードがありません');
  }

  const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, TWITCH_BROADCASTER_ID, JWT_SECRET } = process.env;
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET || !JWT_SECRET) {
    return res.status(500).send('サーバー設定エラー');
  }

  try {
    // 1. codeをaccess_tokenに交換
    const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: 'https://eishou-maker.vercel.app/api/auth/callback'
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(502).send('Twitchトークン取得に失敗');
    }
    const accessToken = tokenData.access_token;

    // 2. ユーザー情報取得
    const userRes = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': TWITCH_CLIENT_ID
      }
    });
    const userData = await userRes.json();
    if (!userData.data || !userData.data[0]) {
      return res.status(502).send('ユーザー情報取得に失敗');
    }
    const userId = userData.data[0].id;
    const userName = userData.data[0].display_name;

    // 3. サブスク状態確認
    let isSubscriber = false;
    try {
      const subRes = await fetch(
        `https://api.twitch.tv/helix/subscriptions/user?broadcaster_id=${TWITCH_BROADCASTER_ID}&user_id=${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Client-Id': TWITCH_CLIENT_ID
          }
        }
      );
      isSubscriber = subRes.status === 200;
    } catch {
      // サブスク確認失敗時はfalseのまま
    }

    // 4. JWTトークン生成してリダイレクト
    const token = jwt.sign(
      { userId, userName, isSubscriber },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.setHeader('Set-Cookie', `eishou_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`);
    res.redirect('/');
  } catch (e) {
    return res.status(500).send('認証処理に失敗しました');
  }
}
