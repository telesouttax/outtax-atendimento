export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { ticketId } = req.query;
  if (!ticketId) return res.status(400).json({ error: 'ticketId obrigatório' });

  try {
    // Busca dados do ticket e contato
    const ticketRes = await fetch(`https://outtax.digisac.me/api/v1/tickets/${ticketId}`, {
      headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
    });
    const ticketData = await ticketRes.json();
    const ticket = ticketData.data || ticketData;

    // Busca contato
    let contact = null;
    if (ticket.contactId) {
      try {
        const cr = await fetch(`https://outtax.digisac.me/api/v1/contacts/${ticket.contactId}`, {
          headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
        });
        if (cr.ok) { const cd = await cr.json(); contact = cd.data || cd; }
      } catch(e) {}
    }

    // Busca todas as mensagens do ticket paginando
    // A API retorna mensagens misturadas — filtramos pelo ticketId de cada mensagem
    const allMsgs = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 20) { // máx 20 páginas = 2000 mensagens
      const r = await fetch(
        `https://outtax.digisac.me/api/v1/messages?ticketId=${ticketId}&limit=100&page=${page}`,
        { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` } }
      );
      const d = await r.json();
      const msgs = d.data || [];

      // Filtra apenas mensagens deste ticket
      const filtradas = msgs.filter(m =>
        m.ticketId === ticketId &&
        m.type === 'chat' &&
        m.text &&
        m.text.trim()
      );

      allMsgs.push(...filtradas);

      // Se retornou menos que o limite, chegou ao fim
      if (msgs.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }

    // Ordena por data crescente
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
        type: m.type,
        createdAt: m.createdAt,
        userId: m.userId,
      })),
      total: allMsgs.length,
    });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
