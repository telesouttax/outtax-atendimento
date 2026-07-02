export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const firstRes = await fetch('https://outtax.digisac.me/api/v1/tickets?limit=100&page=1', {
      headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
    });
    const firstData = await firstRes.json();
    const totalPages = firstData.lastPage || 1;

    const pagesToFetch = Math.min(5, totalPages);
    const pageRequests = [];
    for (let p = totalPages; p > totalPages - pagesToFetch; p--) {
      pageRequests.push(
        fetch(`https://outtax.digisac.me/api/v1/tickets?limit=100&page=${p}`, {
          headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
        }).then(r => r.json())
      );
    }

    const pages = await Promise.all(pageRequests);
    const allTickets = pages.flatMap(p => p.data || []);
    const abertos = allTickets.filter(t => t.isOpen === true || t.endedAt === null);

    if (abertos.length === 0) {
      return res.status(200).json({ data: [], total: 0 });
    }

    const contactIds = [...new Set(abertos.map(t => t.contactId).filter(Boolean))];
    const userIds    = [...new Set(abertos.map(t => t.userId).filter(Boolean))];
    const contactMap = {};
    const userMap    = {};

    await Promise.all([
      ...contactIds.slice(0, 50).map(async id => {
        try {
          // Busca o contato completo pelo endpoint de contatos
          const r = await fetch(`https://outtax.digisac.me/api/v1/contacts/${id}`, {
            headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
          });
          if (r.ok) {
            const raw = await r.json();
            // DIGISAC retorna o objeto diretamente ou dentro de .data
            const c = raw.id ? raw : (raw.data || raw);
            contactMap[id] = {
              id: c.id,
              name: c.name || c.pushname || c.alternativeName || c.internalName || null,
              number: c.number || (c.data && c.data.number) || null,
              email: c.email || null,
              isGroup: c.isGroup || false,
            };
          }
        } catch(e) {}
      }),
      ...userIds.slice(0, 20).map(async id => {
        try {
          const r = await fetch(`https://outtax.digisac.me/api/v1/users/${id}`, {
            headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
          });
          if (r.ok) {
            const raw = await r.json();
            const u = raw.id ? raw : (raw.data || raw);
            userMap[id] = { id: u.id, name: u.name || u.username || null };
          }
        } catch(e) {}
      })
    ]);

    const enriched = abertos.map(t => ({
      ...t,
      contact: contactMap[t.contactId] || null,
      agent:   userMap[t.userId] || null,
    }));

    return res.status(200).json({ data: enriched, total: enriched.length });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
