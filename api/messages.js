export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { ticketId, lastMessageId } = req.query;
  if (!ticketId) return res.status(400).json({ error: 'ticketId obrigatório' });

  try {
    // Busca a última mensagem diretamente pelo ID
    if (lastMessageId) {
      const r = await fetch(
        `https://outtax.digisac.me/api/v1/messages/${lastMessageId}`,
        { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` } }
      );
      if (r.ok) {
        const d = await r.json();
        const msg = d.data || d;
        return res.status(200).json({
          data: [{ isFromMe: msg.isFromMe, type: msg.type, createdAt: msg.createdAt }]
        });
      }
    }

    // Fallback: busca mensagens do ticket e pega a última
    const r = await fetch(
      `https://outtax.digisac.me/api/v1/messages?ticketId=${ticketId}&limit=50`,
      { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` } }
    );
    if (!r.ok) return res.status(r.status).json({ error: 'Erro ao buscar mensagens' });

    const d = await r.json();
    const all = (d.data || []).filter(m => m.ticketId === ticketId || m.type === 'chat');
    const last = all[all.length - 1];

    return res.status(200).json({
      data: last ? [{ isFromMe: last.isFromMe, type: last.type, createdAt: last.createdAt }] : []
    });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
