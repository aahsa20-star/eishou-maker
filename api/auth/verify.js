import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://eishou-maker.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const cookies = parse(req.headers.cookie || '');
  const token = cookies.eishou_token;
  if (!token) return res.json({ loggedIn: false });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({
      loggedIn: true,
      userName: payload.userName,
      isSubscriber: payload.isSubscriber
    });
  } catch {
    return res.json({ loggedIn: false });
  }
}
