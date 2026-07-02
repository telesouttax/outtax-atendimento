export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const response = await fetch('https://outtax.digisac.me/api/v1/users?limit=50', {
      headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` }
    });

    if (!response.ok) return res.status(response.status).json({ error: 'Erro ao buscar agentes' });

    const data = await response.json();
    const users = (data.data || [])
      .filter(u => !u.archivedAt && !u.deletedAt)
      .map(u => ({
        id: u.id,
        name: u.name || u.username || '—',
        email: u.email || null,
        status: u.status || 'offline',
        clientsStatus: u.clientsStatus || {},
        isActiveInternalChat: u.isActiveInternalChat || false,
      }))
      .sort((a, b) => {
        const order = { online: 0, away: 1, offline: 2 };
        return (order[a.status]??2) - (order[b.status]??2);
      });

    return res.status(200).json({ data: users, total: users.length });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
