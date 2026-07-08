export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { ticketId } = req.query;
  if (!ticketId) return res.status(400).json({ error: 'ticketId obrigatório' });

  try {
    // Tenta diferentes endpoints
    const urls = [
      `https://outtax.digisac.me/api/v1/tickets/${ticketId}/messages?limit=3`,
      `https://outtax.digisac.me/api/v1/messages?ticketId=${ticketId}&limit=3`,
      `https://outtax.digisac.me/api/v1/messages?ticket=${ticketId}&limit=3`,
    ];

    const results = await Promise.all(urls.map(async url => {
      try {
        const r = await fetch(url, {
          headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
        });
        const d = await r.json();
        return { url: url.split('/api/v1/')[1], status: r.status, total: d.total, count: (d.data||[]).length, sample: (d.data||[]).slice(0,1).map(m=>({fromMe:m.fromMe,direction:m.direction,type:m.type,origin:m.origin})) };
      } catch(e) { return { url, error: e.message }; }
    }));

    return res.status(200).json({ results });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
