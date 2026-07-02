export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    // Busca as PRIMEIRAS páginas — tickets mais recentes ficam aqui
    const pageRequests = [1, 2, 3, 4, 5].map(p =>
      fetch(`https://outtax.digisac.me/api/v1/tickets?limit=100&page=${p}`, {
        headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
      }).then(r => r.json())
    );

    const pages = await Promise.all(pageRequests);
    const allTickets = pages.flatMap(p => p.data || []);
    const abertos = allTickets.filter(t => t.isOpen === true || t.endedAt === null);

    if (abertos.length === 0) return res.status(200).json({ data: [], total: 0 });

    // Buscar serviços
    let serviceMap = {};
    try {
      const sr = await fetch('https://outtax.digisac.me/api/v1/services', {
        headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
      });
      const sd = await sr.json();
      (sd.data || []).forEach(s => { serviceMap[s.id] = s.name; });
    } catch(e) {}

    const contactIds = [...new Set(abertos.map(t => t.contactId).filter(Boolean))];
    const userIds    = [...new Set(abertos.map(t => t.userId).filter(Boolean))];
    const contactMap = {};
    const userMap    = {};

    await Promise.all([
      ...contactIds.slice(0, 50).map(async id => {
        try {
          const r = await fetch(`https://outtax.digisac.me/api/v1/contacts/${id}`, {
            headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
          });
          if (r.ok) {
            const raw = await r.json();
            const c = raw.id ? raw : (raw.data || raw);
            contactMap[id] = {
              id: c.id,
              name: c.name || c.pushname || c.alternativeName || c.internalName || null,
              number: c.number || null,
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
      serviceName: serviceMap[t.serviceId] || null,
    }));

    return res.status(200).json({ data: enriched, total: enriched.length });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
