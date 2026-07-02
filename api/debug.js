export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Busca o ticket da Luana diretamente pelo protocolo
    const protocol = req.query.protocol || '2026070229026';
    
    // Busca por protocolo nas últimas páginas
    const firstRes = await fetch('https://outtax.digisac.me/api/v1/tickets?limit=1', {
      headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
    });
    const firstData = await firstRes.json();
    const lastPage = firstData.lastPage || 1;

    // Busca as últimas 20 páginas para achar o ticket
    const results = [];
    for (let p = lastPage; p > lastPage - 20; p--) {
      const r = await fetch(`https://outtax.digisac.me/api/v1/tickets?limit=100&page=${p}`, {
        headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
      });
      const d = await r.json();
      const found = (d.data || []).find(t => t.protocol === protocol);
      if (found) {
        return res.status(200).json({ found: true, page: p, ticket: found });
      }
      results.push({ page: p, count: d.data?.length });
    }

    return res.status(200).json({ found: false, searched: results, lastPage });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
