export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { ticketId } = req.query;
  if (!ticketId) return res.status(400).json({ error: 'ticketId obrigatório' });

  try {
    const urls = [
      `https://outtax.digisac.me/api/v1/tickets/${ticketId}/messages?limit=3`,
      `https://outtax.digisac.me/api/v1/messages?ticketId=${ticketId}&limit=3`,
      `https://outtax.digisac.me/api/v1/messages?ticket_id=${ticketId}&limit=3`,
      `https://outtax.digisac.me/api/v1/tickets/${ticketId}`,
    ];

    const results = await Promise.all(urls.map(async url => {
      try {
        const r = await fetch(url, {
          headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
        });
        const d = await r.json();
        const msgs = d.data || (d.id ? [d] : []);
        return {
          url: url.replace('https://outtax.digisac.me/api/v1/', ''),
          status: r.status,
          total: d.total,
          count: msgs.length,
          campos: msgs.length > 0 ? Object.keys(msgs[0]) : [],
          sample: msgs.slice(0,2).map(m => ({
            fromMe: m.fromMe,
            direction: m.direction,
            type: m.type,
            origin: m.origin,
            isFromMe: m.isFromMe,
            lastMessage: m.lastMessage,
            firstMessage: m.firstMessage,
          }))
        };
      } catch(e) { return { url, error: e.message }; }
    }));

    return res.status(200).json({ results });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
