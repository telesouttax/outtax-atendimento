export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const allTickets = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 20) {
      const response = await fetch(
        `https://outtax.digisac.me/api/v1/tickets?limit=100&page=${page}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) break;

      const data = await response.json();
      const tickets = data.data || [];

      const abertos = tickets.filter(t => t.isOpen === true);
      allTickets.push(...abertos);

      if (abertos.length === 0 && tickets.length > 0 && tickets.every(t => t.isOpen === false)) {
        hasMore = false;
      } else if (tickets.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return res.status(200).json({
      data: allTickets,
      total: allTickets.length
    });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
