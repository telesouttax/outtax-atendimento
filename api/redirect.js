export default async function handler(req, res) {
  const { number } = req.query;

  if (!number) {
    return res.redirect('https://outtax.digisac.me');
  }

  // Página intermediária que copia o número e redireciona
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Abrindo DIGISAC...</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Inter',sans-serif;background:#0a1628;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;}
  .card{background:#0f1e38;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px 40px;text-align:center;max-width:400px;}
  .ico{font-size:48px;margin-bottom:16px;}
  h1{font-size:18px;font-weight:800;margin-bottom:8px;}
  p{font-size:14px;color:rgba(255,255,255,0.5);margin-bottom:20px;line-height:1.6;}
  .number{font-family:monospace;font-size:16px;font-weight:700;background:rgba(255,142,42,0.15);border:1px solid rgba(255,142,42,0.3);color:#FF8E2A;padding:10px 20px;border-radius:8px;margin-bottom:20px;letter-spacing:1px;}
  .status{font-size:13px;color:#00d68f;font-weight:600;}
  .bar{width:100%;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;margin-top:20px;overflow:hidden;}
  .bar-fill{height:100%;background:linear-gradient(90deg,#FF8E2A,#285199);border-radius:2px;animation:fill 2s linear forwards;}
  @keyframes fill{from{width:0%;}to{width:100%;}}
</style>
</head>
<body>
<div class="card">
  <div class="ico">📋</div>
  <h1>Abrindo DIGISAC...</h1>
  <p>O número abaixo foi copiado automaticamente.<br>Cole na barra de busca do DIGISAC.</p>
  <div class="number" id="num">${number}</div>
  <div class="status" id="status">⏳ Copiando número...</div>
  <div class="bar"><div class="bar-fill"></div></div>
</div>
<script>
  async function copiarEAbrir() {
    try {
      await navigator.clipboard.writeText('${number}');
      document.getElementById('status').textContent = '✓ Número copiado! Abrindo DIGISAC...';
    } catch(e) {
      // Fallback
      const el = document.createElement('textarea');
      el.value = '${number}';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      document.getElementById('status').textContent = '✓ Número copiado! Abrindo DIGISAC...';
    }
    setTimeout(() => {
      window.location.href = 'https://outtax.digisac.me';
    }, 2000);
  }
  copiarEAbrir();
</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
