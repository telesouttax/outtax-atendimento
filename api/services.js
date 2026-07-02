export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  try {
    const response = await fetch('https://outtax.digisac.me/api/v1/services', {
      headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
    });
    if (!response.ok) return res.status(response.status).json({ error: 'Erro ao buscar serviços' });
    const data = await response.json();
    const simplified = (data.data || []).map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      status: s.status,
      connected: s.connected,
      number: s.number || s.phoneNumber || null,
    }));
    return res.status(200).json({ total: simplified.length, services: simplified });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
