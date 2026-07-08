export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { ticketId } = req.query;
  if (!ticketId) return res.status(400).json({ error: 'ticketId obrigatório' });

  try {
    // Busca ticket e contato
    const ticketRes = await fetch(`https://outtax.digisac.me/api/v1/tickets/${ticketId}`, {
      headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
    });
    const ticketData = await ticketRes.json();
    const ticket = ticketData.data || ticketData;

    let contact = null;
    if (ticket.contactId) {
      try {
        const cr = await fetch(`https://outtax.digisac.me/api/v1/contacts/${ticket.contactId}`, {
          headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
        });
        if (cr.ok) { const cd = await cr.json(); contact = cd.data || cd; }
      } catch(e) {}
    }

    // Busca mensagens — sem filtrar por ticketId (campo não existe na resposta)
    // A API já filtra pelo ticketId na query string
    const allMsgs = [];
    let page = 1;

    while (page <= 20) {
      const r = await fetch(
        `https://outtax.digisac.me/api/v1/messages?ticketId=${ticketId}&limit=100&page=${page}`,
        { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` } }
      );
      const d = await r.json();
      const msgs = d.data || [];

      // Aceita qualquer mensagem com texto, sem filtrar por ticketId
      const comTexto = msgs.filter(m => m.text && m.text.trim() && m.type !== 'system');
      allMsgs.push(...comTexto);

      if (msgs.length < 100) break;
      page++;
    }

    allMsgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return res.status(200).json({
      ticket: {
        id: ticket.id,
        protocol: ticket.protocol,
        startedAt: ticket.startedAt,
        endedAt: ticket.endedAt,
        departmentId: ticket.departmentId,
        metrics: ticket.metrics,
      },
      contact: contact ? {
        name: contact.name || contact.pushname || null,
        number: contact.number || null,
      } : null,
      messages: allMsgs.map(m => ({
        id: m.id,
        isFromMe: m.isFromMe,
        text: m.text || '',
        createdAt: m.createdAt,
      })),
      total: allMsgs.length,
    });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
