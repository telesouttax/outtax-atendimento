export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET');

  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, message: 'Endpoint de alertas ativo' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { ticketId, protocol, departmentName, contactName, minutesOpen, recipientIds } = req.body;

    if (!recipientIds || recipientIds.length === 0) {
      return res.status(400).json({ error: 'Nenhum destinatário informado' });
    }

    const mensagem = `⚠️ *ALERTA DE SLA — OUTTAX*\n\nUm chamado passou de 1h sem resposta:\n\n📋 *Protocolo:* ${protocol || ticketId}\n👤 *Cliente:* ${contactName || 'Não identificado'}\n🏢 *Setor:* ${departmentName}\n⏱ *Tempo aberto:* ${minutesOpen}min\n\nPor favor, verifique e tome uma ação no DIGISAC.`;

    const results = await Promise.all(
      recipientIds.map(async (userId) => {
        try {
          const r = await fetch(`https://outtax.digisac.me/api/v1/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'chat',
              userId: userId,
              text: mensagem,
            })
          });
          const d = await r.json();
          return { userId, ok: r.ok, status: r.status, data: d };
        } catch (e) {
          return { userId, ok: false, error: e.message };
        }
      })
    );

    return res.status(200).json({ sent: results.filter(r => r.ok).length, total: results.length, results });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
