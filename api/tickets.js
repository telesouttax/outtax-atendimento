export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const limit = req.query.limit || 100;

    const response = await fetch(
      `https://outtax.digisac.me/api/v1/tickets?isOpen=true&limit=${limit}&sort=startedAt&order=desc`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'Erro ao buscar tickets', detail: err });
    }

    const data = await response.json();

    const abertos = (data.data || []).filter(t => t.isOpen === true);

    return res.status(200).json({
      ...data,
      data: abertos,
      total: abertos.length
    });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
