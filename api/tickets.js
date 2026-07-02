export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    // Testa diferentes parâmetros de ordenação
    const urls = [
      'https://outtax.digisac.me/api/v1/tickets?limit=20&isOpen=true',
      'https://outtax.digisac.me/api/v1/tickets?limit=20&status=open',
      'https://outtax.digisac.me/api/v1/tickets?limit=20&open=true',
      'https://outtax.digisac.me/api/v1/tickets?limit=20&updatedAt[gte]=2026-07-01',
    ];

    const results = await Promise.all(urls.map(async url => {
      try {
        const r = await fetch(url, {
          headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
        });
        const d = await r.json();
        const abertos = (d.data||[]).filter(t => t.isOpen === true);
        return { url: url.split('?')[1], total: d.total, abertos: abertos.length, amostra: abertos.slice(0,2).map(t=>({protocol:t.protocol,isOpen:t.isOpen})) };
      } catch(e) {
        return { url, erro: e.message };
      }
    }));

    return res.status(200).json({ results });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
