export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://eishou-maker.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(200).end();

  res.setHeader('Set-Cookie', 'eishou_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  res.json({ success: true });
}
