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

const TEMPLATE = `
  <div class="banner"></div>
  <header class="head">
    <div class="avatar-box"><img class="avatar" alt="" src=""><span class="dot offline"></span></div>
    <div class="badges"></div>
  </header>
  <div class="body">
    <h1 class="display"></h1>
    <p class="username"></p>
    <p class="custom"></p>
    <div class="panel">
      <section class="s-bio"><h2>Sobre mim</h2><p class="bio"></p></section>
      <section class="s-acts" hidden><h2>Atividade</h2><div class="acts"></div></section>
      <section><h2>Hora local</h2><p><span class="clock">--:--:--</span> <span class="tz muted"></span></p></section>
      <section class="s-links"><h2>Conexões</h2><div class="links"></div></section>
    </div>
  </div>`;

const grid = $("grid");
const cards = new Map(); // id do perfil -> elemento

// imagem que falha (ícone/emblema) vira texto
grid.addEventListener("error", (e) => {
  const img = e.target;
  if (img.tagName !== "IMG" || img.dataset.fallback === undefined) return;
  const s = document.createElement("span");
  s.className = img.dataset.cls || "";
  s.textContent = img.dataset.fallback;
  img.replaceWith(s);
}, true);

// só mexe no DOM quando o conteúdo mudou (evita piscar as imagens a cada atualização)
function setHTML(node, html) {
  if (node._h === html) return;
  node._h = html;
  node.innerHTML = html;
}
const setText = (node, t) => { if (node.textContent !== t) node.textContent = t; };

function update(el, p) {
  const q = (s) => el.querySelector(s);
  const d = p.discord;
  const u = d?.discord_user;

  setText(q(".display"), p.name || u?.global_name || u?.username || "Perfil");
  setText(q(".username"), u ? "@" + u.username : "");

  const avatar = u?.avatar
    ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${u.avatar.startsWith("a_") ? "gif" : "png"}?size=256`
    : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(p.discordId) >> 22n) % 6n)}.png`;
  if (q(".avatar").getAttribute("src") !== avatar) q(".avatar").src = avatar;

  // banner do Discord (só na API própria); senão a cor escolhida no painel
  const bn = q(".banner");
  bn.style.setProperty("--banner", p.bannerColor || "#5865f2");
  const bannerImg = u?.banner
    ? `url(https://cdn.discordapp.com/banners/${u.id}/${u.banner}.${u.banner.startsWith("a_") ? "gif" : "png"}?size=600)` : "";
  if (bn._img !== bannerImg) { bn._img = bannerImg; bn.style.backgroundImage = bannerImg; }

  const status = d?.discord_status || "offline";
  q(".dot").className = "dot " + status;
  q(".dot").title = status;

  // emblemas automáticos (API) + extras marcados no painel (Nitro, Boost...)
  const autoBadges = DISCORD_FLAGS.filter(([b]) => (u?.public_flags ?? 0) & b).map(([, n, h]) => [n, `https://cdn.discordapp.com/badge-icons/${h}.png`]);
  const keys = [...(p.badges || [])];
  // Nitro detectado pelo bot (OAuth): entra sozinho, a menos que você tenha marcado um nível de Nitro na mão
  if ((d?.premium_type ?? 0) > 0 && !keys.some((k) => k.startsWith("nitro"))) keys.unshift("nitro");
  const extraBadges = keys.map((k) => MANUAL_BADGES[k]).filter(Boolean);
  setHTML(q(".badges"), [...autoBadges, ...extraBadges].map(([n, src]) =>
    `<img class="badge-icon" src="${esc(src)}" alt="${n}" title="${n}" data-fallback="${n}" data-cls="badge">`).join(""));

  const custom = d?.activities.find((a) => a.type === 4);
  setText(q(".custom"), custom ? `${custom.emoji?.name || ""} ${custom.state || ""}`.trim() : "");

  const rows = [];
  if (d?.listening_to_spotify && d.spotify) {
    const s = d.spotify;
    rows.push(`<div class="act"><img src="${esc(s.album_art_url)}" alt="">
      <div><small>Ouvindo Spotify</small><b>${esc(s.song)}</b><span>${esc(s.artist)}</span>
      <div class="bar"><i class="sp-bar" data-s="${s.timestamps.start}" data-e="${s.timestamps.end}"></i></div></div></div>`);
  }
  for (const a of (d?.activities ?? []).filter((a) => a.type !== 4 && a.name !== "Spotify")) {
    const img = a.assets?.large_image && a.application_id && !a.assets.large_image.includes(":")
      ? `https://cdn.discordapp.com/app-assets/${esc(a.application_id)}/${esc(a.assets.large_image)}.png` : "";
    rows.push(`<div class="act">${img ? `<img src="${img}" alt="">` : `<div class="ph">🎮</div>`}
      <div><small>${a.type === 0 ? "Jogando" : a.type === 1 ? "Transmitindo" : a.type === 3 ? "Assistindo" : "Atividade"}</small>
      <b>${esc(a.name)}</b>${a.details ? `<span>${esc(a.details)}</span>` : ""}${a.state ? `<span>${esc(a.state)}</span>` : ""}</div></div>`);
  }
  setHTML(q(".acts"), rows.join(""));
  q(".s-acts").hidden = !rows.length;

  setText(q(".bio"), p.bio || "");
  q(".s-bio").hidden = !p.bio;
  el._tz = p.timezone || "America/Sao_Paulo";
  setText(q(".tz"), `(${el._tz})`);

  // ícones da Simple Icons (https://simpleicons.org): "icon" é o nome do site
  setHTML(q(".links"), (p.links || []).map((l) =>
    `<a href="${esc(l.url)}" target="_blank" rel="noopener" title="${esc(l.label)}">` +
    (l.icon
      ? `<img src="https://cdn.simpleicons.org/${esc(l.icon)}/white" alt="${esc(l.label)}" data-fallback="${esc(l.label)}">`
      : esc(l.label)) + `</a>`).join(""));
  q(".s-links").hidden = !(p.links || []).length;
}

function renderAll(list) {
  if (!list.length) {
    cards.forEach((el) => el.remove());
    cards.clear();
    grid.innerHTML = `<p class="empty muted">Nenhum perfil ainda. Adicione em <a href="admin.html"><u>admin.html</u></a>.</p>`;
    return;
  }
  grid.querySelector(".empty")?.remove();
  const ids = new Set(list.map((p) => p.id));
  for (const [id, el] of cards) if (!ids.has(id)) { el.remove(); cards.delete(id); }
  list.forEach((p, i) => {
    let el = cards.get(p.id);
    if (!el) {
      el = document.createElement("article");
      el.className = "profile";
      el.innerHTML = TEMPLATE;
      cards.set(p.id, el);
    }
    update(el, p);
    if (grid.children[i] !== el) grid.insertBefore(el, grid.children[i] || null);
  });
}

// ---------- fontes de dados ----------
// apiUrl "/" = API no mesmo servidor do site (VPS); vazio = só o perfil do config.js via Lanyard
const USE_API = !!C.apiUrl;
const API = (C.apiUrl || "").replace(/\/$/, "");

async function fetchProfiles() {
  if (USE_API) {
    const j = await (await fetch(`${API}/api/profiles`)).json();
    if (!j.success) throw new Error();
    return j.data;
  }
  // sem API própria: um único perfil do config.js, com status via Lanyard
  const p = { id: "main", ...C };
  try {
    const j = await (await fetch(`https://api.lanyard.rest/v1/users/${C.discordId}`)).json();
    p.discord = j.success ? j.data : null;
  } catch { p.discord = null; }
  return [p];
}

let loaded = false;
async function refresh() {
  try {
    renderAll(await fetchProfiles());
    loaded = true;
  } catch {
    if (!loaded) grid.innerHTML = `<p class="empty muted">API indisponível no momento.</p>`;
  }
}
refresh();
setInterval(refresh, 10000);

// ---------- relógios e barras do Spotify ----------
setInterval(() => {
  for (const el of cards.values()) {
    setText(el.querySelector(".clock"), new Date().toLocaleTimeString("pt-BR", { timeZone: el._tz }));
    const bar = el.querySelector(".sp-bar");
    if (bar) {
      const s = +bar.dataset.s, e = +bar.dataset.e;
      bar.style.width = Math.min(100, Math.max(0, ((Date.now() - s) / (e - s)) * 100)) + "%";
    }
  }
}, 500);
