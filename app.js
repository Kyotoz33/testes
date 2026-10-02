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
if (C.bannerColor) root.style.setProperty("--banner", C.bannerColor);
document.title = `${C.name} — Perfil`;
$("bio").textContent = C.bio;
// ícones da Simple Icons (https://simpleicons.org): use o nome do site em "icon"
$("links").innerHTML = C.links.map((l) =>
  `<a href="${esc(l.url)}" target="_blank" rel="noopener" title="${esc(l.label)}" data-label="${esc(l.label)}">` +
  `<img src="https://cdn.simpleicons.org/${esc(l.icon)}/white" alt="${esc(l.label)}"></a>`).join("");
$("links").querySelectorAll("img").forEach((img) => {
  img.onerror = () => img.replaceWith(img.parentElement.dataset.label); // sem ícone: mostra o nome
});
$("tz").textContent = `(${C.timezone})`;
setInterval(() => {
  $("clock").textContent = new Date().toLocaleTimeString("pt-BR", { timeZone: C.timezone });
}, 1000);

// ---------- Discord via Lanyard ----------
// [bit da flag, nome, hash do ícone oficial em cdn.discordapp.com/badge-icons/<hash>.png]
const FLAGS = [
  [1 << 0, "Staff do Discord", "5e74e9b61934fc1f67c65515d1f7e60d"],
  [1 << 1, "Parceiro", "3f9748e53446a137a052f3454e2de41e"],
  [1 << 2, "HypeSquad Events", "bf01d1073931f921909045f3a39fd264"],
  [1 << 3, "Bug Hunter", "2717692c7dca7289b35297368a940dd0"],
  [1 << 6, "HypeSquad Bravery", "8a88d63823d8a71cd5e390baa45efa02"],
  [1 << 7, "HypeSquad Brilliance", "011940fd013da3f7fb926e4a1cd2e618"],
  [1 << 8, "HypeSquad Balance", "3aa41de486fa12454c3761e8e223442e"],
  [1 << 9, "Early Supporter", "7060786766c9c840eb3019e725d2b358"],
  [1 << 14, "Bug Hunter Nível 2", "848f79194d4be5ff5f81505cbd0ce1e6"],
  [1 << 17, "Dev de Bot Verificado", "6df5892e0f35b051f8b61eace34f4967"],
  [1 << 22, "Desenvolvedor Ativo", "6bdc42827a38498929a4920da12695d9"],
];

// sem cor de perfil na API (Lanyard): usa a cor predominante do avatar
let lastAvatar;
function colorFromAvatar(src) {
  if (src === lastAvatar) return;
  lastAvatar = src;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 32;
      const x = cv.getContext("2d");
      x.drawImage(img, 0, 0, 32, 32);
      const px = x.getImageData(0, 0, 32, 32).data;
      let r = 0, g = 0, b = 0, w = 0;
      for (let i = 0; i < px.length; i += 4) {
        const max = Math.max(px[i], px[i + 1], px[i + 2]), min = Math.min(px[i], px[i + 1], px[i + 2]);
        const k = (max - min) + 1; // pixels mais saturados pesam mais
        r += px[i] * k; g += px[i + 1] * k; b += px[i + 2] * k; w += k;
      }
      root.style.setProperty("--banner", `rgb(${Math.round(r / w)},${Math.round(g / w)},${Math.round(b / w)})`);
    } catch {} // canvas bloqueado: mantém a cor de bannerColor
  };
  img.src = src;
}

function render(d) {
  const u = d.discord_user;
  $("display").textContent = u.global_name || u.username;
  $("username").textContent = "@" + u.username;
  $("avatar").src = u.avatar
    ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${u.avatar.startsWith("a_") ? "gif" : "png"}?size=256`
    : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(u.id) >> 22n) % 6n)}.png`;
  // banner: só vem da API própria; senão usa a cor de bannerColor
  if (u.accent_color) root.style.setProperty("--banner", u.accent_color);
  else if (!u.banner) colorFromAvatar($("avatar").src);
  if (u.banner) $("banner").style.backgroundImage = `url(https://cdn.discordapp.com/banners/${u.id}/${u.banner}.${u.banner.startsWith("a_") ? "gif" : "png"}?size=600)`;
  $("dot").className = "dot " + d.discord_status;
  $("dot").title = d.discord_status;
  $("badges").innerHTML = FLAGS.filter(([b]) => u.public_flags & b).map(([, n, h]) =>
    `<img class="badge-icon" src="https://cdn.discordapp.com/badge-icons/${h}.png" alt="${n}" title="${n}" data-name="${n}">`).join("");
  // se a imagem falhar, mostra o nome em texto
  $("badges").querySelectorAll("img").forEach((img) => {
    img.onerror = () => {
      const s = document.createElement("span");
      s.className = "badge";
      s.textContent = img.dataset.name;
      img.replaceWith(s);
    };
  });

  const custom = d.activities.find((a) => a.type === 4);
  $("custom").textContent = custom ? `${custom.emoji?.name || ""} ${custom.state || ""}`.trim() : "";

  const rows = [];
  if (d.listening_to_spotify && d.spotify) {
    const s = d.spotify;
    rows.push(`<div class="act"><img src="${esc(s.album_art_url)}" alt="">
      <div><small>Ouvindo Spotify</small><b>${esc(s.song)}</b><span>${esc(s.artist)}</span>
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
