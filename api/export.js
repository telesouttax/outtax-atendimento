export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { ticketId } = req.query;
  if (!ticketId) return res.status(400).json({ error: 'ticketId obrigatório' });

  try {
    // Busca dados do ticket
    const [ticketRes, msgsRes] = await Promise.all([
      fetch(`https://outtax.digisac.me/api/v1/tickets/${ticketId}`, {
        headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
      }),
      fetch(`https://outtax.digisac.me/api/v1/messages?ticketId=${ticketId}&limit=500`, {
        headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
      })
    ]);

    const ticketData = await ticketRes.json();
    const msgsData   = await msgsRes.json();

    const ticket = ticketData.data || ticketData;
    const msgs   = (msgsData.data || []).filter(m => m.type === 'chat' && m.text);

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
      messages: msgs.map(m => ({
        id: m.id,
        isFromMe: m.isFromMe,
        text: m.text || '',
        type: m.type,
        createdAt: m.createdAt,
        userId: m.userId,
      })),
      total: msgs.length,
    });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
