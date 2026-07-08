export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  try {
    const limit = parseInt(req.query.limit) || 50;
    const page  = parseInt(req.query.page)  || 1;

    // Descobre última página
    const firstRes = await fetch(
      `https://outtax.digisac.me/api/v1/tickets?limit=${limit}&page=1`,
      { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` } }
    );
    const firstData = await firstRes.json();
    const lastPage  = firstData.lastPage || 1;
    const total     = firstData.total    || 0;

    // Busca página a partir do fim (mais recentes primeiro)
    const targetPage = Math.max(1, lastPage - page + 1);

    const r = await fetch(
      `https://outtax.digisac.me/api/v1/tickets?limit=${limit}&page=${targetPage}`,
      { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` } }
    );
    const d = await r.json();
    const tickets = (d.data || []).reverse();

    // Enriquece com contato — busca em paralelo
    const contactIds = [...new Set(tickets.map(t => t.contactId).filter(Boolean))];
    const contactMap = {};

    await Promise.all(contactIds.map(async id => {
      try {
        const cr = await fetch(`https://outtax.digisac.me/api/v1/contacts/${id}`, {
          headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
        });
        if (cr.ok) {
          const cd = await cr.json();
          const c = cd.id ? cd : (cd.data || cd);
          // Pega o melhor nome disponível
          const name = c.name || c.pushname || c.alternativeName || c.internalName || null;
          contactMap[id] = {
            id: c.id,
            name: name,
            number: c.number || null,
            isGroup: c.isGroup || false,
          };
        }
      } catch(e) {}
    }));

    const enriched = tickets.map(t => ({
      ...t,
      contact: contactMap[t.contactId] || (t.contact ? {
        id: t.contact.id,
        name: t.contact.name || null,
        number: t.contact.number || null,
        isGroup: t.contact.isGroup || false,
      } : null),
    }));

    return res.status(200).json({ data: enriched, total, lastPage });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
