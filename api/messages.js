export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { ticketId, lastMessageId } = req.query;
  if (!ticketId && !lastMessageId) return res.status(200).json({ data: [] });

  try {
    // Estratégia 1: busca pelo lastMessageId diretamente
    if (lastMessageId) {
      const r1 = await fetch(
        `https://outtax.digisac.me/api/v1/messages/${lastMessageId}`,
        { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` } }
      );
      if (r1.ok) {
        const raw = await r1.json();
        const msg = raw.data || raw;
        if (msg && msg.isFromMe !== undefined) {
          return res.status(200).json({
            data: [{ isFromMe: msg.isFromMe, type: msg.type, createdAt: msg.createdAt }],
            source: 'byId'
          });
        }
      }
    }

    // Estratégia 2: busca últimas mensagens pelo ticketId e pega a última
    if (ticketId) {
      // Descobre total de páginas
      const firstR = await fetch(
        `https://outtax.digisac.me/api/v1/messages?ticketId=${ticketId}&limit=100&page=1`,
        { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` } }
      );
      const firstD = await firstR.json();
      const lastPage = firstD.lastPage || 1;

      // Busca última página
      const r2 = await fetch(
        `https://outtax.digisac.me/api/v1/messages?ticketId=${ticketId}&limit=100&page=${lastPage}`,
        { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` } }
      );
      const d2 = await r2.json();
      const msgs = (d2.data || []).filter(m => m.type === 'chat' || m.type === 'text');

      if (msgs.length > 0) {
        const ultima = msgs[msgs.length - 1];
        return res.status(200).json({
          data: [{ isFromMe: ultima.isFromMe, type: ultima.type, createdAt: ultima.createdAt }],
          source: 'byTicket',
          totalMsgs: firstD.total,
          lastPage
        });
      }
    }

    return res.status(200).json({ data: [] });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
