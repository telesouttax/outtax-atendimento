export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { ticketId, contactId } = req.query;
  if (!ticketId && !contactId) return res.status(400).json({ error: 'ticketId ou contactId obrigatório' });

  try {
    let ticket = null;
    let resolvedContactId = contactId;

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

    // Descobre total de páginas
    const firstRes = await fetch(
      `https://outtax.digisac.me/api/v1/messages?contactId=${resolvedContactId}&limit=100&page=1`,
      { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` } }
    );
    const firstData = await firstRes.json();
    const lastPage = firstData.lastPage || 1;
    const totalMsgs = firstData.total || 0;

    // Busca todas as páginas (do início ao fim)
    const allMsgs = [];
    const maxPages = Math.min(lastPage, 50); // máx 5000 mensagens

    // Busca todas as páginas em paralelo (em lotes de 10)
    for (let batch = 1; batch <= maxPages; batch += 10) {
      const batchPages = [];
      for (let p = batch; p <= Math.min(batch + 9, maxPages); p++) {
        batchPages.push(p);
      }
      const batchResults = await Promise.all(batchPages.map(p =>
        fetch(`https://outtax.digisac.me/api/v1/messages?contactId=${resolvedContactId}&limit=100&page=${p}`, {
          headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
        }).then(r => r.json())
      ));
      batchResults.forEach(d => {
        const msgs = (d.data || []).filter(m => m.text && m.text.trim() && m.type !== 'system');
        allMsgs.push(...msgs);
      });
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
        name: contact.name || contact.pushname || contact.alternativeName || contact.number || null,
        number: contact.number || null,
      } : null,
      messages: allMsgs.map(m => ({
        id: m.id,
        isFromMe: m.isFromMe,
        text: m.text || '',
        createdAt: m.createdAt,
      })),
      total: allMsgs.length,
      totalMsgs,
      pages: lastPage,
    });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
