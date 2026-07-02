export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const hoje = new Date();
    const seteDias = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Busca total de páginas
    const firstRes = await fetch('https://outtax.digisac.me/api/v1/tickets?limit=100&page=1', {
      headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
    });
    const firstData = await firstRes.json();
    const totalPages = firstData.lastPage || 1;

    // Busca últimas 5 páginas (tickets mais recentes)
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

    // Filtra apenas abertos
    const abertos = allTickets.filter(t => t.isOpen === true || t.endedAt === null);

    if (abertos.length === 0) {
      return res.status(200).json({ data: [], total: 0 });
    }

    // Busca perfil completo dos contatos
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
            const c = await r.json();
            // O DIGISAC retorna o contato dentro de .data ou diretamente
            const contact = c.data || c;
            contactMap[id] = contact;
          }
        } catch(e) {}
      }),
      ...userIds.slice(0, 20).map(async id => {
        try {
          const r = await fetch(`https://outtax.digisac.me/api/v1/users/${id}`, {
            headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
          });
          if (r.ok) {
            const u = await r.json();
            userMap[id] = u.data || u;
          }
        } catch(e) {}
      })
    ]);

    const enriched = abertos.map(t => ({
      ...t,
      contact: contactMap[t.contactId] || t.contact || null,
      agent:   userMap[t.userId]    || null,
    }));

    return res.status(200).json({ data: enriched, total: enriched.length });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
