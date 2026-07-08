export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { ticketId } = req.query;
  if (!ticketId) return res.status(400).json({ error: 'ticketId obrigatório' });

  try {
    const r = await fetch(
      `https://outtax.digisac.me/api/v1/tickets/${ticketId}/messages?limit=3`,
      { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` } }
    );
    const d = await r.json();
    // Mostra campos relevantes de cada mensagem
    const msgs = (d.data || []).map(m => ({
      id: m.id,
      fromMe: m.fromMe,
      direction: m.direction,
      type: m.type,
      isFromMe: m.isFromMe,
      origin: m.origin,
      sender: m.sender,
      createdAt: m.createdAt,
      text: (m.text||m.body||'').slice(0,50)
    }));
    return res.status(200).json({ total: d.total, msgs });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
