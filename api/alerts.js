export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { tipo, protocol, departmentName, contactName, minutesOpen, transferredAt } = req.body;
    const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK;

    // Define emoji e urgência baseado no tipo e tempo
    let emoji, titulo, cor, descricao;

    if (tipo === 'time_sem_resposta') {
      emoji = minutesOpen >= 120 ? '🔴' : minutesOpen >= 90 ? '🟠' : minutesOpen >= 60 ? '🟡' : '🟡';
      titulo = `Cliente aguardando resposta do time`;
      descricao = `O cliente enviou uma mensagem e o time ainda não respondeu.`;
    } else if (tipo === 'cliente_sem_resposta') {
      emoji = minutesOpen >= 120 ? '🔴' : minutesOpen >= 90 ? '🟠' : minutesOpen >= 60 ? '🟡' : '🟡';
      titulo = `Time aguardando resposta do cliente`;
      descricao = `O time enviou uma mensagem e o cliente ainda não respondeu.`;
    } else if (tipo === 'horario_comercial') {
      emoji = '🕐';
      titulo = `Mensagem recebida em horário comercial sem resposta`;
      descricao = `Cliente enviou mensagem entre 10h e 17h e não foi respondido.`;
    } else if (tipo === 'transferencia_sem_atendimento') {
      emoji = '🔀';
      titulo = `Transferência sem atendimento`;
      descricao = `Chamado transferido há 30 minutos e ninguém atendeu.`;
    } else {
      emoji = '⚠️';
      titulo = `Alerta de SLA`;
      descricao = `Chamado requer atenção.`;
    }

    const fmtMin = m => m < 60 ? `${m}min` : `${Math.floor(m/60)}h${m%60 > 0 ? ` ${m%60}min` : ''}`;

    const payload = {
      cards: [{
        header: {
          title: `${emoji} ${titulo}`,
          subtitle: `OUTTAX — Dashboard de Atendimento`,
        },
        sections: [{
          widgets: [
            { keyValue: { topLabel: 'Cliente', content: contactName || 'Não identificado', icon: 'PERSON' } },
            { keyValue: { topLabel: 'Setor', content: departmentName, icon: 'BUILDING_INSIGHTS_1' } },
            { keyValue: { topLabel: 'Protocolo', content: protocol || '—', icon: 'TICKET' } },
            { keyValue: { topLabel: 'Tempo sem resposta', content: fmtMin(minutesOpen), icon: 'CLOCK' } },
            { textParagraph: { text: `<i>${descricao}</i>` } },
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

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'Erro ao enviar alerta', detail: err });
    }

    return res.status(200).json({ ok: true, sent: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
