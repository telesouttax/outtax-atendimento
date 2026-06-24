export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const numero = '5521960194636';
    const mensagem = `⚠️ *TESTE DE ALERTA — OUTTAX*\n\nEste é um teste do sistema de alertas do dashboard.\n\nSe você recebeu esta mensagem, o sistema está funcionando! ✅\n\n📋 *Protocolo:* TESTE-001\n👤 *Cliente:* Cliente Teste\n🏢 *Setor:* Fiscal\n⏱ *Tempo:* 65min em aberto\n\n_Dashboard OUTTAX_`;

    // Busca o serviceId (canal WhatsApp) disponível
    const servRes = await fetch('https://outtax.digisac.me/api/v1/services', {
      headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
    });
    const servData = await servRes.json();
    const services = servData.data || [];
    const whatsapp = services.find(s => s.type === 'whatsapp' || s.channel === 'whatsapp') || services[0];

    if (!whatsapp) {
      return res.status(404).json({ error: 'Nenhum canal WhatsApp encontrado', services });
    }

    // Envia mensagem direta para o número via API
    const sendRes = await fetch('https://outtax.digisac.me/api/v1/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: numero,
        serviceId: whatsapp.id,
        type: 'chat',
        text: mensagem,
      })
    });

    const sendData = await sendRes.json();

    if (!sendRes.ok) {
      // Tenta formato alternativo
      const send2Res = await fetch('https://outtax.digisac.me/api/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: numero,
          serviceId: whatsapp.id,
          text: mensagem,
          type: 'chat'
        })
      });
      const send2Data = await send2Res.json();
      return res.status(send2Res.status).json({ 
        attempt2: true, 
        ok: send2Res.ok, 
        data: send2Data,
        serviceUsed: whatsapp.id,
        serviceType: whatsapp.type
      });
    }

    return res.status(200).json({ 
      ok: true, 
      message: 'Mensagem enviada!',
      number: numero,
      serviceId: whatsapp.id,
      data: sendData
    });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
