export default async function handler(req, res) {
  res.setHeader('Set-Cookie', 'eishou_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  res.json({ success: true });
}
