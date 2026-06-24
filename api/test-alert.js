export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK;

    const payload = {
      text: `🚨 *TESTE DE ALERTA — OUTTAX Dashboard*\n\nSe você recebeu esta mensagem, o sistema de alertas está funcionando corretamente! ✅\n\n📋 *Protocolo:* TESTE-001\n👤 *Cliente:* Cliente Teste\n🏢 *Setor:* Fiscal\n⏱ *Tempo aberto:* 65 minutos\n\n_Este é um teste automático do Dashboard de Atendimento OUTTAX._`
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Erro ao enviar para Google Chat', detail: data });
    }

    return res.status(200).json({ ok: true, message: 'Mensagem de teste enviada com sucesso!' });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
