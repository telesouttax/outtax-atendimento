export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { lastMessageId } = req.query;
  if (!lastMessageId) return res.status(200).json({ data: [] });

  try {
    // Busca a última mensagem diretamente pelo ID — mais confiável
    const r = await fetch(
      `https://outtax.digisac.me/api/v1/messages/${lastMessageId}`,
      { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` } }
    );

    if (!r.ok) return res.status(200).json({ data: [] });

    const d = await r.json();
    const msg = d.data || d;

    return res.status(200).json({
      data: [{ isFromMe: msg.isFromMe, type: msg.type, createdAt: msg.createdAt }]
    });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
