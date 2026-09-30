const C = window.CONFIG;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- tema ----------
const root = document.documentElement;
try { root.dataset.theme = localStorage.getItem("theme") || "dark"; } catch { root.dataset.theme = "dark"; }
$("theme").onclick = () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch {}
};

// ---------- conteúdo estático ----------
document.title = `${C.name} — Perfil`;
$("bio").textContent = C.bio;
$("skills").innerHTML = C.skills.map((s) => `<span>${esc(s)}</span>`).join("");
$("links").innerHTML = C.links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.icon)} ${esc(l.label)}</a>`).join("");
$("tz").textContent = `(${C.timezone})`;
setInterval(() => {
  $("clock").textContent = new Date().toLocaleTimeString("pt-BR", { timeZone: C.timezone });
}, 1000);

// ---------- Discord via Lanyard ----------
const FLAGS = [
  [1 << 0, "Staff"], [1 << 1, "Parceiro"], [1 << 2, "HypeSquad Events"], [1 << 3, "Bug Hunter"],
  [1 << 6, "Bravery"], [1 << 7, "Brilliance"], [1 << 8, "Balance"], [1 << 9, "Early Supporter"],
  [1 << 14, "Bug Hunter 2"], [1 << 17, "Dev de Bot Verificado"], [1 << 22, "Dev Ativo"],
];

function render(d) {
  const u = d.discord_user;
  $("display").textContent = u.global_name || u.username;
  $("username").textContent = "@" + u.username;
  $("avatar").src = u.avatar
    ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${u.avatar.startsWith("a_") ? "gif" : "png"}?size=256`
    : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(u.id) >> 22n) % 6n)}.png`;
  $("dot").className = "dot " + d.discord_status;
  $("dot").title = d.discord_status;
  $("badges").innerHTML = FLAGS.filter(([b]) => u.public_flags & b).map(([, n]) => `<span class="badge">${n}</span>`).join("");

  const custom = d.activities.find((a) => a.type === 4);
  $("custom").textContent = custom ? `${custom.emoji?.name || ""} ${custom.state || ""}`.trim() : "";

  const rows = [];
  if (d.listening_to_spotify && d.spotify) {
    const s = d.spotify;
    rows.push(`<div class="act"><img src="${esc(s.album_art_url)}" alt="">
      <div><small>🎧 Ouvindo no Spotify</small><b>${esc(s.song)}</b><span>${esc(s.artist)}</span>
      <div class="bar"><i id="sp-bar" data-s="${s.timestamps.start}" data-e="${s.timestamps.end}"></i></div></div></div>`);
  }
  for (const a of d.activities.filter((a) => a.type !== 4 && a.name !== "Spotify")) {
    const img = a.assets?.large_image && a.application_id && !a.assets.large_image.includes(":")
      ? `https://cdn.discordapp.com/app-assets/${a.application_id}/${a.assets.large_image}.png` : "";
    rows.push(`<div class="act">${img ? `<img src="${img}" alt="">` : `<div class="ph">🎮</div>`}
      <div><small>${a.type === 0 ? "Jogando" : a.type === 1 ? "Transmitindo" : a.type === 3 ? "Assistindo" : "Atividade"}</small>
      <b>${esc(a.name)}</b>${a.details ? `<span>${esc(a.details)}</span>` : ""}${a.state ? `<span>${esc(a.state)}</span>` : ""}</div></div>`);
  }
  $("activities").innerHTML = rows.join("");
  $("activities-card").hidden = !rows.length;
}

setInterval(() => {
  const el = $("sp-bar");
  if (!el) return;
  const s = +el.dataset.s, e = +el.dataset.e;
  el.style.width = Math.min(100, Math.max(0, ((Date.now() - s) / (e - s)) * 100)) + "%";
}, 500);

function connect() {
  const ws = new WebSocket("wss://api.lanyard.rest/socket");
  let hb;
  ws.onmessage = (m) => {
    const { op, d, t } = JSON.parse(m.data);
    if (op === 1) {
      ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: C.discordId } }));
      hb = setInterval(() => ws.send(JSON.stringify({ op: 3 })), d.heartbeat_interval);
    } else if (op === 0) render(d);
  };
  ws.onclose = () => { clearInterval(hb); setTimeout(connect, 5000); };
}

const fail = () => {
  $("display").textContent = C.name;
  $("username").textContent = C.apiUrl
    ? "API indisponível no momento"
    : "Configure seu discordId em config.js e entre no servidor do Lanyard";
};

if (C.apiUrl) {
  // API própria (pasta server/): consulta a cada 10s
  const poll = () =>
    fetch(`${C.apiUrl.replace(/\/$/, "")}/api/profile`)
      .then((r) => r.json())
      .then((j) => { if (!j.success) throw new Error(); render(j.data); })
      .catch(fail);
  poll();
  setInterval(poll, 10000);
} else {
  fetch(`https://api.lanyard.rest/v1/users/${C.discordId}`)
    .then((r) => r.json())
    .then((j) => {
      if (!j.success) throw new Error(j.error?.message);
      render(j.data);
      connect();
    })
    .catch(fail);
}

// ---------- GitHub ----------
if (C.githubUser) {
  fetch(`https://api.github.com/users/${C.githubUser}/repos?sort=updated&per_page=6`)
    .then((r) => r.json())
    .then((repos) => {
      if (!Array.isArray(repos) || !repos.length) return;
      $("repos").innerHTML = repos.filter((r) => !r.fork).map((r) =>
        `<a href="${esc(r.html_url)}" target="_blank" rel="noopener"><b>${esc(r.name)}</b>
         <small>${esc(r.description || "Sem descrição")} · ⭐ ${r.stargazers_count} ${r.language ? "· " + esc(r.language) : ""}</small></a>`).join("");
      $("gh-card").hidden = false;
    })
    .catch(() => {});
}
