export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { ticketId, contactId } = req.query;
  if (!ticketId && !contactId) return res.status(400).json({ error: 'ticketId ou contactId obrigatório' });

  try {
    let ticket = null;
    let resolvedContactId = contactId;

    // Se veio ticketId, busca o ticket para pegar o contactId
    if (ticketId) {
      const ticketRes = await fetch(`https://outtax.digisac.me/api/v1/tickets/${ticketId}`, {
        headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
      });
      const ticketData = await ticketRes.json();
      ticket = ticketData.data || ticketData;
      resolvedContactId = ticket.contactId;
    }

    // Busca contato
    let contact = null;
    if (resolvedContactId) {
      try {
        const cr = await fetch(`https://outtax.digisac.me/api/v1/contacts/${resolvedContactId}`, {
          headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
        });
        if (cr.ok) { const cd = await cr.json(); contact = cd.data || cd; }
      } catch(e) {}
    }

    // Busca TODAS as mensagens do contato (conversa completa)
    const allMsgs = [];
    let page = 1;

    while (page <= 50) { // até 5000 mensagens
      const r = await fetch(
        `https://outtax.digisac.me/api/v1/messages?contactId=${resolvedContactId}&limit=100&page=${page}`,
        { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` } }
      );
      const d = await r.json();
      const msgs = d.data || [];

      const comTexto = msgs.filter(m => m.text && m.text.trim() && m.type !== 'system');
      allMsgs.push(...comTexto);

      if (msgs.length < 100) break;
      page++;
    }

    allMsgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return res.status(200).json({
      ticket: ticket ? {
        id: ticket.id,
        protocol: ticket.protocol,
        startedAt: ticket.startedAt,
        endedAt: ticket.endedAt,
        departmentId: ticket.departmentId,
        metrics: ticket.metrics,
      } : null,
      contact: contact ? {
        id: resolvedContactId,
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
