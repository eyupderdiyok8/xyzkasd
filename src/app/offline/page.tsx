export default function OfflinePage() {
  return (
    <html lang="tr">
      <head>
        <title>Çevrimdışı — Su Arıtma Servis ERP</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`body{margin:0;background:#030712;color:#fff;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem}.icon{font-size:4rem;margin-bottom:1rem}h1{font-size:1.5rem;margin-bottom:0.5rem}p{color:#9ca3af;margin-bottom:1.5rem;font-size:0.9rem}button{background:linear-gradient(135deg,#3b82f6,#06b6d4);color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:0.75rem;font-weight:600;font-size:0.9rem;cursor:pointer}`}</style>
      </head>
      <body>
        <div>
          <div className="icon">📡</div>
          <h1>İnternet Bağlantısı Yok</h1>
          <p>Şu anda çevrimdışısınız. İnternet bağlantınız geldiğinde sayfa otomatik olarak yenilenecektir.</p>
          <button onClick={() => window.location.reload()}>Tekrar Dene</button>
        </div>
      </body>
    </html>
  );
}
