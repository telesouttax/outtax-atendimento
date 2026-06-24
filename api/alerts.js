export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { protocol, departmentName, contactName, minutesOpen } = req.body;
    const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK;

    const emoji = minutesOpen >= 240 ? '🔴' : minutesOpen >= 120 ? '🟡' : '🟠';
    const urgencia = minutesOpen >= 240 ? 'CRÍTICO — Acima de 4h' : minutesOpen >= 120 ? 'ATENÇÃO — Acima de 2h' : 'ALERTA — Acima de 1h';

    const payload = {
      cards: [{
        header: {
          title: `${emoji} Alerta de SLA — OUTTAX`,
          subtitle: urgencia,
          imageUrl: 'https://www.google.com/images/icons/product/chat-512.png'
        },
        sections: [{
          widgets: [
            { keyValue: { topLabel: 'Cliente', content: contactName || 'Não identificado' } },
            { keyValue: { topLabel: 'Setor', content: departmentName } },
            { keyValue: { topLabel: 'Protocolo', content: protocol || '—' } },
            { keyValue: { topLabel: 'Tempo em aberto', content: `${minutesOpen} minutos` } },
            {
              buttons: [{
                textButton: {
                  text: '🔗 Abrir Dashboard',
                  onClick: { openLink: { url: 'https://outtax-atendimento.vercel.app' } }
                }
              }]
            }
          ]
        }]
      }]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Erro ao enviar alerta', detail: data });
    }

    return res.status(200).json({ ok: true, sent: true });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
