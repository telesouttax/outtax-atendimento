export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  try {
    const limit = parseInt(req.query.limit) || 50;
    const page  = parseInt(req.query.page)  || 1;

    // Descobre total de páginas
    const firstRes = await fetch(
      `https://outtax.digisac.me/api/v1/tickets?limit=${limit}&page=1`,
      { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` } }
    );
    const firstData = await firstRes.json();
    const lastPage  = firstData.lastPage || 1;
    const total     = firstData.total    || 0;

    // Busca a página a partir do fim (mais recentes primeiro)
    const targetPage = Math.max(1, lastPage - page + 1);

    const r = await fetch(
      `https://outtax.digisac.me/api/v1/tickets?limit=${limit}&page=${targetPage}`,
      { headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` } }
    );
    const d = await r.json();

    // Inverte para mostrar mais recentes primeiro
    const data = (d.data || []).reverse();

    return res.status(200).json({ data, total, lastPage });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
