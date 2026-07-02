export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    // Tenta buscar tickets ativos usando o endpoint correto do DIGISAC
    // O DIGISAC usa "currentTicketId" nos contatos para indicar ticket ativo
    // Vamos buscar pela última página (tickets mais recentes) e filtrar por data recente
    
    const hoje = new Date();
    const ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);
    
    // Busca tickets das últimas 24h percorrendo as últimas páginas
    const responses = await Promise.all([
      fetch('https://outtax.digisac.me/api/v1/tickets?limit=100&page=1', {
        headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
      }),
    ]);
    
    const data = await responses[0].json();
    const totalPages = data.lastPage || 1;
    
    // Busca as últimas 3 páginas (tickets mais recentes)
    const lastPages = Math.min(3, totalPages);
    const pageRequests = [];
    for (let p = totalPages; p > totalPages - lastPages; p--) {
      pageRequests.push(
        fetch(`https://outtax.digisac.me/api/v1/tickets?limit=100&page=${p}`, {
          headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
        }).then(r => r.json())
      );
    }
    
    const pages = await Promise.all(pageRequests);
    const allTickets = pages.flatMap(p => p.data || []);
    
    // Filtra tickets das últimas 24h que estejam abertos OU sem endedAt recente
    const ativos = allTickets.filter(t => {
      const updatedAt = new Date(t.updatedAt);
      const startedAt = new Date(t.startedAt);
      const isRecent = updatedAt > ontem || startedAt > ontem;
      const isOpen = t.isOpen === true || t.endedAt === null;
      return isRecent && isOpen;
    });

    // Se não achou abertos, mostra os mais recentes das últimas 24h
    const recentes = allTickets.filter(t => {
      const updatedAt = new Date(t.updatedAt);
      return updatedAt > ontem;
    }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    const resultado = ativos.length > 0 ? ativos : recentes;

    if (resultado.length === 0) {
      return res.status(200).json({ data: [], total: 0 });
    }

    // Enriquece com contato e agente
    const contactIds = [...new Set(resultado.map(t => t.contactId).filter(Boolean))];
    const userIds = [...new Set(resultado.map(t => t.userId).filter(Boolean))];
    const contactMap = {};
    const userMap = {};

    await Promise.all([
      ...contactIds.slice(0, 50).map(async id => {
        try {
          const r = await fetch(`https://outtax.digisac.me/api/v1/contacts/${id}`, {
            headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
          });
          if (r.ok) { const c = await r.json(); contactMap[id] = c.data || c; }
        } catch(e) {}
      }),
      ...userIds.slice(0, 20).map(async id => {
        try {
          const r = await fetch(`https://outtax.digisac.me/api/v1/users/${id}`, {
            headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
          });
          if (r.ok) { const u = await r.json(); userMap[id] = u.data || u; }
        } catch(e) {}
      })
    ]);

    const enriched = resultado.map(t => ({
      ...t,
      contact: contactMap[t.contactId] || null,
      agent: userMap[t.userId] || null,
    }));

    return res.status(200).json({ 
      data: enriched, 
      total: enriched.length,
      debug: {
        totalTickets: data.total,
        lastPage: totalPages,
        abiertos: ativos.length,
        recentes24h: recentes.length,
        mostrando: ativos.length > 0 ? 'abertos' : 'recentes 24h'
      }
    });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
