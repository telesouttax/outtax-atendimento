export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const nivel = parseInt(req.query.nivel) || 1;
    const tipo  = req.query.tipo || 'time_sem_resposta';
    
    // Calcula minutos baseado no nível
    let minutos = 30;
    for(let i = 1; i < nivel; i++) minutos += 30 * (i + 1);

    const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK;
    const fmtMin = m => m < 60 ? `${m}min` : `${Math.floor(m/60)}h${m%60>0?` ${m%60}min`:''}`;

    const emoji = nivel <= 1 ? '🟡' : nivel <= 2 ? '🟠' : '🔴';
    const urgencia = nivel <= 1 ? 'Atenção' : nivel <= 2 ? 'Urgente' : 'Crítico';
    const titulo = tipo === 'time_sem_resposta' ? 'Time não respondeu o cliente' : 'Cliente não respondeu o time';
    const descricao = tipo === 'time_sem_resposta'
      ? `O cliente enviou uma mensagem e o time está sem responder há *${fmtMin(minutos)}*.`
      : `O time enviou uma mensagem e o cliente está sem responder há *${fmtMin(minutos)}*.`;

    const payload = {
      cards: [{
        header: {
          title: `${emoji} [TESTE] ${titulo} — ${urgencia}`,
          subtitle: `OUTTAX · Alerta #${nivel} · ${fmtMin(minutos)} sem resposta`,
        },
        sections: [{
          widgets: [
            { keyValue: { topLabel: 'Cliente', content: 'Cliente Teste OUTTAX', icon: 'PERSON' } },
            { keyValue: { topLabel: 'Setor', content: 'Fiscal/Impostos', icon: 'DESCRIPTION' } },
            { keyValue: { topLabel: 'Protocolo', content: 'TESTE-001', icon: 'TICKET' } },
            { keyValue: { topLabel: 'Tempo sem resposta', content: fmtMin(minutos), icon: 'CLOCK' } },
            { textParagraph: { text: descricao } },
            { buttons: [{ textButton: { text: '🔗 Abrir Dashboard', onClick: { openLink: { url: 'https://outtax-atendimento.vercel.app' } } } }] }
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
      return res.status(response.status).json({ error: 'Erro ao enviar', detail: err });
    }

    return res.status(200).json({ 
      ok: true, 
      mensagem: `Alerta #${nivel} enviado com sucesso!`,
      tipo,
      minutos,
      proximoAlerta: `Em mais ${30*(nivel+1)}min (Alerta #${nivel+1})`
    });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
