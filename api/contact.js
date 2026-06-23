export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID do contato é obrigatório' });
  }

  try {
    const response = await fetch(`https://outtax.digisac.me/api/v1/contacts/${id}`, {
      headers: {
        'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Contato não encontrado' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
