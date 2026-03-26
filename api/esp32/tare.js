const privateIP = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { ip } = req.query;
  if (!ip || !privateIP.test(ip)) {
    return res.status(400).json({ error: 'Invalid or disallowed IP' });
  }
  try {
    const esp32Res = await fetch(`http://${ip}/tare`, { method: 'POST' });
    const text = await esp32Res.text();
    res.status(esp32Res.status).send(text);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach ESP32', details: err.message });
  }
}
