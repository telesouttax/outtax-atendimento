export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const page = req.query.page || 1;
    const limit = 100;

    const url = `https://outtax.digisac.me/api/v1/tickets?isOpen=1&limit=${limit}&page=${page}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'Erro ao buscar tickets', detail: err });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
