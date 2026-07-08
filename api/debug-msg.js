export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { ticketId } = req.query;
  if (!ticketId) return res.status(400).json({ error: 'ticketId obrigatório' });

  try {
    // Busca últimas mensagens do ticket
    const r = await fetch(
      `https://outtax.digisac.me/api/v1/messages?ticketId=${ticketId}&limit=5`,
      { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` } }
    );
    const d = await r.json();
    const msgs = (d.data || []).map(m => ({
      id: m.id,
      fromMe: m.fromMe,
      isFromMe: m.isFromMe,
      direction: m.direction,
      type: m.type,
      origin: m.origin,
      status: m.status,
      contactId: m.contactId,
      userId: m.userId,
      serviceId: m.serviceId,
      createdAt: m.createdAt,
      text: (m.text||m.body||m.caption||'').slice(0,30),
      allKeys: Object.keys(m)
    }));
    return res.status(200).json({ total: d.total, count: msgs.length, msgs });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
