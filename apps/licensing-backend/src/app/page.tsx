export default function Home() {
  return (
    <main style={{ padding: 48, maxWidth: 720 }}>
      <h1 style={{ color: "#FCD34D" }}>Da Excel a Software — Licensing API</h1>
      <p>Backend interno per il sistema licenze dei mini-tool.</p>
      <ul>
        <li><code>POST /api/licenses/activate</code></li>
        <li><code>POST /api/licenses/heartbeat</code></li>
        <li><code>POST /api/licenses/deactivate</code></li>
        <li><code>GET  /api/updates/[slug]/[platform]</code></li>
      </ul>
      <p>
        Admin: <a href="/admin/licenses" style={{ color: "#FCD34D" }}>/admin/licenses</a>
      </p>
    </main>
  );
}
