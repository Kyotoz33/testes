const C = window.CONFIG;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- tema ----------
const root = document.documentElement;
try { root.dataset.theme = localStorage.getItem("theme") || "dark"; } catch { root.dataset.theme = "dark"; }
$("theme").onclick = () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch {}
  for (const el of cards.values()) applyTint(el);
};

const TEMPLATE = `
  <div class="banner"></div>
  <div class="body">
    <div class="avatar-box"><img class="avatar" alt="" src=""><span class="dot offline"></span></div>
    <h1 class="display"></h1>
    <div class="uname-row">
      <span class="username"></span>
      <div class="badges"></div>
    </div>
    <p class="custom"></p>
    <div class="panel">
      <section class="s-bio"><h2>Sobre mim</h2><p class="bio"></p></section>
      <section class="s-acts" hidden><h2>Atividade</h2><div class="acts"></div></section>
      <section class="s-clock" hidden><h2>Hora local</h2><p><span class="clock">--:--:--</span> <span class="tz muted"></span></p></section>
      <section class="s-links"><h2>Conexões</h2><div class="links"></div></section>
    </div>
  </div>`;

// ---------- cores ----------
function parseColor(c) {
  if (!c) return null;
  const hex = /^#([0-9a-f]{6})$/i.exec(c);
  if (hex) return [0, 2, 4].map((k) => parseInt(hex[1].slice(k, k + 2), 16));
  const rgb = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(c);
  return rgb ? [+rgb[1], +rgb[2], +rgb[3]] : null;
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb(h, s, l) {
  const f = (n) => { const k = (n + h / 30) % 12; return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}

// Cor "dominante viva" do avatar: junta os pixels coloridos por matiz e escolhe o grupo mais forte,
// em vez da média (que numa foto escura dá quase preto). Se o navegador não puder ler a imagem, devolve null.
const avatarColors = new Map();
function avatarColor(url) {
  if (!avatarColors.has(url)) {
    avatarColors.set(url, new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const N = 32, c = document.createElement("canvas");
          c.width = c.height = N;
          const x = c.getContext("2d", { willReadFrequently: true });
          x.drawImage(img, 0, 0, N, N);
          const d = x.getImageData(0, 0, N, N).data;
          const bins = Array.from({ length: 12 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
          let ar = 0, ag = 0, ab = 0, n = 0;
          for (let k = 0; k < d.length; k += 4) {
            if (d[k + 3] < 200) continue;
            const r = d[k], g = d[k + 1], b = d[k + 2];
            ar += r; ag += g; ab += b; n++;
            const [h, s, l] = rgbToHsl(r, g, b), v = Math.max(r, g, b) / 255;
            if (v < 0.2 || s < 0.2 || l > 0.92) continue; // ignora preto, branco e cinza
            const w = s * s * v, bin = bins[Math.min(11, Math.floor(h / 30))];
            bin.w += w; bin.r += r * w; bin.g += g * w; bin.b += b * w;
          }
          if (!n) return resolve(null);
          const best = bins.reduce((m, o) => (o.w > m.w ? o : m));
          let rgb = best.w > n * 0.02 ? [best.r / best.w, best.g / best.w, best.b / best.w] : [ar / n, ag / n, ab / n];
          // nunca deixa o banner preto ou estourado de claro
          const [h, s, l] = rgbToHsl(...rgb);
          rgb = hslToRgb(h, s, Math.min(0.6, Math.max(0.32, l)));
          resolve(`rgb(${rgb.join(", ")})`);
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    }));
  }
  return avatarColors.get(url);
}

// Tom do cartão: o fundo e os blocos ficam numa versão bem escura (ou clara, no tema claro) da cor do perfil,
// como no Discord. Cor sem saturação (cinza) mantém o cartão neutro.
function applyTint(el) {
  const rgb = parseColor(el._color);
  if (!rgb) return;
  const [h, s] = rgbToHsl(...rgb), dark = root.dataset.theme !== "light";
  const sat = Math.round(Math.min(s, dark ? 0.5 : 0.6) * 100);
  const set = (k, l) => el.style.setProperty(k, `hsl(${Math.round(h)} ${sat}% ${l}%)`);
  if (dark) { set("--card", 9); set("--panel", 13); set("--line", 20); }
  else { set("--card", 97); set("--panel", 94); set("--line", 86); }
}

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
  el._p = p; // guardado para o botão "Ouvir" poder redesenhar o cartão
  const q = (s) => el.querySelector(s);
  const d = p.discord;
  const u = d?.discord_user;

  setText(q(".display"), p.name || u?.global_name || u?.username || "Perfil");
  setText(q(".username"), u ? "@" + u.username : "");

  const avatar = u?.avatar
    ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${u.avatar.startsWith("a_") ? "gif" : "png"}?size=256`
    : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(p.discordId) >> 22n) % 6n)}.png`;
  if (q(".avatar").getAttribute("src") !== avatar) q(".avatar").src = avatar;

  // Banner: imagem do Discord > cor de destaque da conta > cor escolhida no painel > cor média do avatar
  const bn = q(".banner");
  const bannerImg = u?.banner
    ? `url("https://cdn.discordapp.com/banners/${u.id}/${u.banner}.${u.banner.startsWith("a_") ? "gif" : "png"}?size=600")` : "";
  if (bn._img !== bannerImg) { bn._img = bannerImg; bn.style.backgroundImage = bannerImg; }
  const manualColor = p.bannerColor && p.bannerColor.toLowerCase() !== "#5865f2" ? p.bannerColor : ""; // #5865f2 = padrão antigo
  const fixedColor = manualColor || u?.accent_color || "";
  const setColor = (c) => { el.style.setProperty("--banner", c); el._color = c; applyTint(el); }; // no cartão todo: banner e degradê usam a mesma cor
  if (fixedColor) { bn._src = fixedColor; setColor(fixedColor); }
  else if (bn._src !== avatar) {
    bn._src = avatar;
    avatarColor(avatar).then((c) => { if (bn._src === avatar) setColor(c || "#5865f2"); });
  }

  const status = d?.discord_status || "offline";
  q(".dot").className = "dot " + status;
  q(".dot").title = { online: "Online", idle: "Ausente", dnd: "Não perturbe", offline: "Offline" }[status] || status;

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
    // Player oficial do Spotify, só carregado quando a pessoa clica em "Ouvir" (o navegador bloqueia som automático
    // e o iframe de terceiros só entra com consentimento). Toca prévia de 30 s; completo se a pessoa estiver logada no Spotify.
    const open = el._listen && s.track_id;
    rows.push(`<div class="act"><img src="${esc(s.album_art_url)}" alt="">
      <div><small>Ouvindo Spotify</small><b>${esc(s.song)}</b><span>${esc(s.artist)}</span>
      <div class="bar"><i class="sp-bar" data-s="${s.timestamps.start}" data-e="${s.timestamps.end}"></i></div>
      ${s.track_id ? `<button type="button" class="listen" data-listen>${open ? "■ Fechar player" : "▶ Ouvir"}</button>` : ""}</div></div>` +
      (open ? `<iframe class="sp-embed" src="https://open.spotify.com/embed/track/${esc(s.track_id)}?utm_source=generator&theme=0" height="80"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Spotify"></iframe>` : ""));
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
  q(".s-clock").hidden = p.showClock !== true;

  // ícones da Simple Icons (https://simpleicons.org): "icon" é o nome do site
  setHTML(q(".links"), (p.links || []).map((l) =>
    `<a href="${esc(l.url)}" target="_blank" rel="noopener" title="${esc(l.label)}">` +
    (l.icon
      ? `<img src="https://cdn.simpleicons.org/${esc(l.icon)}/white" alt="${esc(l.label)}" data-fallback="${esc(l.label)}">`
      : esc(l.label)) + `</a>`).join(""));
  q(".s-links").hidden = !(p.links || []).length;
}

grid.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-listen]");
  const el = btn?.closest(".profile");
  if (!el?._p) return;
  el._listen = !el._listen;
  update(el, el._p);
});

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
