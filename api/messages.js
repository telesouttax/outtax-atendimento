export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { ticketId } = req.query;
  if (!ticketId) return res.status(400).json({ error: 'ticketId obrigatório' });

  try {
    const response = await fetch(
      `https://outtax.digisac.me/api/v1/tickets/${ticketId}/messages?limit=5`,
      { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` } }
    );
    if (!response.ok) return res.status(response.status).json({ error: 'Erro ao buscar mensagens' });
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
