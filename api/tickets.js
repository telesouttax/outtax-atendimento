export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    // Busca contatos que têm currentTicketId (ticket aberto agora)
    const contactRes = await fetch(
      'https://outtax.digisac.me/api/v1/contacts?limit=100&page=1&hasCurrentTicket=true',
      { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` } }
    );
    const contactData = await contactRes.json();
    const contacts = contactData.data || [];

    // Filtra só os que têm currentTicketId
    const comTicket = contacts.filter(c => c.currentTicketId);

    if (comTicket.length === 0) {
      // Tenta buscar tickets diretamente pelo updatedAt recente
      const hoje = new Date().toISOString().split('T')[0];
      const r2 = await fetch(
        `https://outtax.digisac.me/api/v1/tickets?limit=100&page=1`,
        { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` } }
      );
      const d2 = await r2.json();
      const total = d2.total || 0;
      const lastPage = d2.lastPage || 1;

      // Percorre páginas do fim para o início até achar abertos
      const abertos = [];
      for (let p = lastPage; p >= 1 && abertos.length === 0; p--) {
        const rp = await fetch(
          `https://outtax.digisac.me/api/v1/tickets?limit=100&page=${p}`,
          { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` } }
        );
        const dp = await rp.json();
        const found = (dp.data || []).filter(t => t.isOpen === true);
        abertos.push(...found);
        if (p < lastPage - 10) break; // limita busca
      }

      return res.status(200).json({ data: abertos, total: abertos.length, source: 'pages' });
    }

    // Busca os tickets pelo currentTicketId de cada contato
    const ticketIds = [...new Set(comTicket.map(c => c.currentTicketId))];
    const ticketDetails = await Promise.all(
      ticketIds.slice(0, 50).map(async id => {
        try {
          const r = await fetch(`https://outtax.digisac.me/api/v1/tickets/${id}`, {
            headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
          });
          if (!r.ok) return null;
          const d = await r.json();
          return d.data || d;
        } catch(e) { return null; }
      })
    );

    const abertos = ticketDetails.filter(t => t && (t.isOpen === true || t.endedAt === null));

    // Enriquece com contato e agente
    const contactMap = {};
    comTicket.forEach(c => {
      if(c.currentTicketId) contactMap[c.currentTicketId] = {
        id: c.id,
        name: c.name || c.pushname || c.alternativeName || null,
        number: c.number || (c.data && c.data.number) || null,
        isGroup: c.isGroup || false,
      };
    });

    const userIds = [...new Set(abertos.map(t => t.userId).filter(Boolean))];
    const userMap = {};
    await Promise.all(userIds.slice(0,20).map(async id => {
      try {
        const r = await fetch(`https://outtax.digisac.me/api/v1/users/${id}`, {
          headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
        });
        if(r.ok) { const u = await r.json(); userMap[id] = { id: u.id, name: u.name || u.username }; }
      } catch(e) {}
    }));

    const enriched = abertos.map(t => ({
      ...t,
      contact: contactMap[t.id] || null,
      agent: userMap[t.userId] || null,
    }));

    return res.status(200).json({ data: enriched, total: enriched.length, source: 'currentTicketId' });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
