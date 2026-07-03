export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { tipo, protocol, departmentName, contactName, minutesOpen, nivel, contactId, ticketId } = req.body;
    const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK;

    const fmtMin = m => m < 60 ? `${m}min` : `${Math.floor(m/60)}h${m%60 > 0 ? ` ${m%60}min` : ''}`;

    let emoji, titulo, descricao;
    if (tipo === 'time_sem_resposta') {
      emoji = nivel <= 1 ? '🟡' : nivel <= 2 ? '🟠' : '🔴';
      titulo = `Time não respondeu o cliente`;
      descricao = `O cliente enviou uma mensagem e o time está sem responder há *${fmtMin(minutesOpen)}*.`;
    } else {
      emoji = nivel <= 1 ? '🟡' : nivel <= 2 ? '🟠' : '🔴';
      titulo = `Cliente não respondeu o time`;
      descricao = `O time enviou uma mensagem e o cliente está sem responder há *${fmtMin(minutesOpen)}*.`;
    }

    const urgencia = nivel <= 1 ? 'Atenção' : nivel <= 2 ? 'Urgente' : 'Crítico';

    const payload = {
      cards: [{
        header: {
          title: `${emoji} ${titulo} — ${urgencia}`,
          subtitle: `OUTTAX · Alerta #${nivel} · ${fmtMin(minutesOpen)} sem resposta`,
        },
        sections: [{
          widgets: [
            { keyValue: { topLabel: 'Cliente', content: contactName || 'Não identificado', icon: 'PERSON' } },
            { keyValue: { topLabel: 'Setor', content: departmentName, icon: 'DESCRIPTION' } },
            { keyValue: { topLabel: 'Protocolo', content: protocol || '—', icon: 'TICKET' } },
            { keyValue: { topLabel: 'Tempo sem resposta', content: fmtMin(minutesOpen), icon: 'CLOCK' } },
            { textParagraph: { text: descricao } },
            { buttons: [
              { textButton: { text: '📊 Dashboard', onClick: { openLink: { url: 'https://outtax-atendimento.vercel.app' } } } },
              { textButton: { text: '📋 Histórico', onClick: { openLink: { url: `https://outtax.digisac.me/ticket-history/contacts/${contactId || ''}/true` } } } },
              { textButton: { text: '💬 Conversa', onClick: { openLink: { url: `https://outtax.digisac.me/ticket-history/contacts/${contactId || ''}/true` } } } }
            ] }
          ]
        }]
      }]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'Erro ao enviar alerta', detail: err });
    }

    return res.status(200).json({ ok: true, sent: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
