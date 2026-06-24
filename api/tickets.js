export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const limit = 100;

    // Busca tickets
    const tickRes = await fetch(
      `https://outtax.digisac.me/api/v1/tickets?limit=${limit}&page=1`,
      { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}`, 'Content-Type': 'application/json' } }
    );
    if (!tickRes.ok) return res.status(tickRes.status).json({ error: 'Erro ao buscar tickets' });
    const tickData = await tickRes.json();
    const tickets = (tickData.data || []).filter(t => t.isOpen === true || t.endedAt === null);

    if (tickets.length === 0) return res.status(200).json({ data: [], total: 0 });

    // Busca contatos únicos em paralelo
    const contactIds = [...new Set(tickets.map(t => t.contactId).filter(Boolean))];
    const contactMap = {};

    await Promise.all(
      contactIds.slice(0, 50).map(async id => {
        try {
          const r = await fetch(`https://outtax.digisac.me/api/v1/contacts/${id}`, {
            headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
          });
          if (r.ok) {
            const c = await r.json();
            contactMap[id] = c.data || c;
          }
        } catch (e) {}
      })
    );

    // Busca usuários (agentes) únicos em paralelo
    const userIds = [...new Set(tickets.map(t => t.userId).filter(Boolean))];
    const userMap = {};

    await Promise.all(
      userIds.slice(0, 20).map(async id => {
        try {
          const r = await fetch(`https://outtax.digisac.me/api/v1/users/${id}`, {
            headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
          });
          if (r.ok) {
            const u = await r.json();
            userMap[id] = u.data || u;
          }
        } catch (e) {}
      })
    );

    // Enriquece tickets com dados do contato e agente
    const enriched = tickets.map(t => ({
      ...t,
      contact: contactMap[t.contactId] || null,
      agent: userMap[t.userId] || null,
    }));

    return res.status(200).json({ data: enriched, total: enriched.length });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
