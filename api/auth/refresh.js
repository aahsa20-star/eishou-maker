import jwt from 'jsonwebtoken';
import { parse, serialize } from 'cookie';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://eishou-maker.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let token;
  try {
    const cookies = parse(req.headers.cookie || '');
    token = cookies.eishou_token;
  } catch {}
  if (!token) return res.status(401).json({ error: 'Not logged in' });

  const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, TWITCH_BROADCASTER_ID, JWT_SECRET } = process.env;
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET || !JWT_SECRET) {
    return res.status(500).json({ error: 'Server config error' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // App Access Tokenを取得
    const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials'
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(502).json({ error: 'Twitch token error' });
    }

    // サブスク状態を再確認
    let isSubscriber = false;
    try {
      const subRes = await fetch(
        `https://api.twitch.tv/helix/subscriptions/user?broadcaster_id=${TWITCH_BROADCASTER_ID}&user_id=${payload.userId}`,
        {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Client-Id': TWITCH_CLIENT_ID
          }
        }
      );
      isSubscriber = subRes.status === 200;
    } catch {}

    // JWTを更新（7日）
    const newToken = jwt.sign(
      { userId: payload.userId, userName: payload.userName, isSubscriber },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.setHeader('Set-Cookie', serialize('eishou_token', newToken, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60
    }));

    return res.status(200).json({
      loggedIn: true,
      userName: payload.userName,
      isSubscriber
    });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
