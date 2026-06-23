export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  try {
    const [tickRes, deptRes, contactRes] = await Promise.all([
      fetch('https://outtax.digisac.me/api/v1/tickets?limit=100&page=1', {
        headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
      }),
      fetch('https://outtax.digisac.me/api/v1/departments', {
        headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
      }),
      fetch('https://outtax.digisac.me/api/v1/contacts?limit=1', {
        headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
      })
    ]);
    const [tickData, deptData, contactData] = await Promise.all([
      tickRes.json(), deptRes.json(), contactRes.json()
    ]);
    const tickets = tickData.data || [];
    const tmas = tickets.filter(t => t.metrics?.messagingTime > 0).map(t => Math.floor(t.metrics.messagingTime / 60));
    const tmaMedia = tmas.length ? Math.floor(tmas.reduce((a, b) => a + b, 0) / tmas.length) : 0;
    const porDept = {};
    tickets.forEach(t => { porDept[t.departmentId] = (porDept[t.departmentId] || 0) + 1; });
    const origens = { manual: 0, automatic: 0 };
    tickets.forEach(t => { origens[t.origin] = (origens[t.origin] || 0) + 1; });
    return res.status(200).json({
      totalTickets: tickData.total || 0,
      totalContacts: contactData.total || 0,
      totalDepts: (deptData.data || []).length,
      tmaMedia,
      porDept,
      origens,
      departments: deptData.data || []
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
