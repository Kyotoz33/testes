const USE_API = !!window.CONFIG.apiUrl;
const API = (window.CONFIG.apiUrl || "").replace(/\/$/, "");
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

try { document.documentElement.dataset.theme = localStorage.getItem("theme") || "dark"; } catch { document.documentElement.dataset.theme = "dark"; }

let token = "";
try { token = sessionStorage.getItem("adm") || ""; } catch {}
let profiles = [];
let editing = null; // id em edição, ou null para novo

function msg(text, ok) {
  $("msg").hidden = !text;
  $("msg").textContent = text || "";
  $("msg").className = "msg" + (ok ? " ok" : "");
}

async function api(path, method = "GET", body) {
  const r = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && token) logout("Sessão expirada. Entre novamente.");
  if (!j.success) throw new Error(j.error?.message || "Erro");
  return j;
}

function logout(text) {
  token = "";
  try { sessionStorage.removeItem("adm"); } catch {}
  $("panel").hidden = true;
  $("login").hidden = false;
  msg(text || "");
}

async function refresh() {
  profiles = (await api("/api/profiles?t=" + Date.now())).data; // ?t= fura o cache da CDN
  $("list").innerHTML = profiles.length ? profiles.map((p) => {
    const u = p.discord?.discord_user;
    const av = u?.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64` : "";
    return `<div class="item">${av ? `<img src="${av}" alt="">` : `<div class="noav"></div>`}
      <div class="info"><b>${esc(p.name || u?.global_name || u?.username || "Perfil")}</b><small>${esc(p.discordId)}</small>${gstat(p)}</div>
      <div class="btns"><button class="btn" data-edit="${p.id}">Editar</button><button class="btn danger" data-del="${p.id}">Excluir</button></div></div>`;
  }).join("") : `<p class="muted">Nenhum perfil ainda.</p>`;
}

// o bot enxerga essa pessoa? (precisa estar no servidor do bot para ter status ao vivo)
function gstat(p) {
  const d = p.discord;
  if (!d) return `<small class="gstat">Bot offline: status indisponível</small>`;
  // o que o Discord informou sobre a cor do perfil: ajuda a entender de onde vem a cor do banner no site
  const u = d.discord_user, hex = /^#[0-9a-f]{6}$/i;
  const cor = u?.accent_color && hex.test(u.accent_color)
    ? `<span class="swatch" style="background:${u.accent_color}"></span>cor de destaque ${u.accent_color}`
    : "sem cor de destaque (o site usa a cor do avatar)";
  const corLinha = `<small class="gstat">Discord informou: ${cor}${u?.banner ? " · tem banner" : ""}</small>`;
  // o que o bot está vendo agora: mostra se o Spotify (ou qualquer atividade) chegou até aqui
  const nomes = (d.activities || []).map((a) => a.name).filter(Boolean);
  const vistas = `<small class="gstat">O bot vê agora: status ${esc(d.discord_status)} · atividades: ${nomes.length ? esc(nomes.join(", ")) : "nenhuma"}${d.listening_to_spotify ? " (Spotify detectado)" : ""}</small>`;
  const nitro = d.premium_type > 0 ? `<small class="gstat in">✔ Nitro detectado pelo bot (emblema automático)</small>` : "";
  return (d.in_guild
    ? `<small class="gstat in">✔ no servidor do bot (status ao vivo)</small>`
    : `<small class="gstat out">✖ fora do servidor do bot: sem status ao vivo</small>`) + vistas + corLinha + nitro;
}

// emblemas extras (Nitro, Boost...): caixas de marcar com o ícone oficial
$("f-badges").innerHTML = Object.entries(MANUAL_BADGES).map(([k, [name, src]]) =>
  `<label><input type="checkbox" value="${k}"><img src="${esc(src)}" alt="" onerror="this.remove()">${esc(name)}</label>`).join("");

function linkRow(l = {}) {
  const row = document.createElement("div");
  row.className = "link-row";
  row.innerHTML = `<input class="l-icon" list="icons" placeholder="ícone" value="${esc(l.icon)}">
    <input class="l-label" placeholder="nome" maxlength="30" value="${esc(l.label)}">
    <input class="l-url" placeholder="https://..." value="${esc(l.url)}">
    <button type="button" class="btn danger" title="Remover">×</button>`;
  row.querySelector("button").onclick = () => row.remove();
  $("f-links").append(row);
}

function openForm(p) {
  editing = p?.id ?? null;
  $("form-title").textContent = p ? "Editar perfil" : "Novo perfil";
  $("f-discord").value = p?.discordId ?? "";
  $("f-name").value = p?.name ?? "";
  $("f-bio").value = p?.bio ?? "";
  $("f-tz").value = p?.timezone ?? "America/Sao_Paulo";
  // "#5865f2" era o valor padrão salvo antes da cor automática existir: conta como automático
  const manual = !!p?.bannerColor && p.bannerColor.toLowerCase() !== "#5865f2";
  $("f-autocolor").checked = !manual;
  $("f-color").value = manual ? p.bannerColor : "#5865f2";
  $("f-color").disabled = !manual;
  $("f-clock").checked = p?.showClock === true;
  document.querySelectorAll("#f-badges input").forEach((c) => (c.checked = (p?.badges || []).includes(c.value)));
  $("f-links").innerHTML = "";
  (p?.links?.length ? p.links : [{}]).forEach(linkRow);
  $("form").hidden = false;
  $("form").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

$("login").onsubmit = async (e) => {
  e.preventDefault();
  msg("");
  try {
    token = (await api("/api/login", "POST", { password: $("password").value })).token;
    try { sessionStorage.setItem("adm", token); } catch {}
    $("password").value = "";
    await show();
  } catch (err) { msg(err.message); }
};
$("logout").onclick = () => logout();
$("add").onclick = () => openForm(null);
$("f-autocolor").onchange = () => { $("f-color").disabled = $("f-autocolor").checked; };
$("cancel").onclick = () => ($("form").hidden = true);
$("add-link").onclick = () => linkRow();

$("list").onclick = async (e) => {
  const edit = e.target.dataset.edit, del = e.target.dataset.del;
  if (edit) return openForm(profiles.find((p) => p.id === edit));
  if (del && confirm("Excluir este perfil?")) {
    try { await api("/api/profiles/" + del, "DELETE"); msg("Perfil excluído.", true); $("form").hidden = true; await refresh(); }
    catch (err) { msg(err.message); }
  }
};

$("form").onsubmit = async (e) => {
  e.preventDefault();
  msg("");
  const body = {
    discordId: $("f-discord").value.trim(),
    name: $("f-name").value,
    bio: $("f-bio").value,
    timezone: $("f-tz").value,
    bannerColor: $("f-autocolor").checked ? "" : $("f-color").value,
    showClock: $("f-clock").checked,
    badges: [...document.querySelectorAll("#f-badges input:checked")].map((c) => c.value),
    links: [...$("f-links").children].map((r) => ({
      icon: r.querySelector(".l-icon").value,
      label: r.querySelector(".l-label").value,
      url: r.querySelector(".l-url").value,
    })),
  };
  try {
    await (editing ? api("/api/profiles/" + editing, "PUT", body) : api("/api/profiles", "POST", body));
    $("form").hidden = true;
    msg("Salvo! O site atualiza em até 10 segundos.", true);
    await refresh();
  } catch (err) { msg(err.message); }
};

async function show() {
  $("login").hidden = true;
  $("panel").hidden = false;
  // sem bot próprio (Netlify), os convites automáticos não existem: o status vem do bot de quem enviar
  try {
    if (!(await api("/api/info")).invites) {
      document.querySelector(".invite .row-copy").hidden = true;
      $("inv-out").hidden = true;
      $("inv-help").textContent = "O status ao vivo vem do bot configurado no seu site (ex.: o de um amigo). " +
        "Para aparecer, a pessoa precisa estar em um servidor onde esse bot esteja: peça ao dono do bot o convite " +
        "desse servidor e mande para quem você quer mostrar. Quando a pessoa entrar, o aviso \"fora do servidor\" some sozinho.";
    }
  } catch {}
  await Promise.all([refresh(), refreshStock()]);
}

// ---------- convites ----------
function showInvite(url) {
  $("inv-out").hidden = false;
  $("inv-url").value = url;
  $("inv-url").select();
}
$("inv-guild").onclick = async () => {
  msg("");
  try { showInvite((await api("/api/guild-invite", "POST")).url); } catch (err) { msg(err.message); }
};
$("inv-bot").onclick = async () => {
  msg("");
  try { showInvite((await api("/api/bot-invite")).url); } catch (err) { msg(err.message); }
};
$("inv-copy").onclick = async () => {
  msg((await copyText($("inv-url").value)) ? "Link copiado." : "Não consegui copiar; selecione e copie na mão.", true);
};

// ---------- abas ----------
document.querySelectorAll(".tab").forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t === b));
    $("tab-profiles").hidden = b.dataset.tab !== "profiles";
    $("tab-stock").hidden = b.dataset.tab !== "stock";
    msg("");
  };
});

// ---------- estoque de códigos ----------
let stock = [];

const fmt = (t) => new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const mask = (c) => (c.length <= 6 ? "•".repeat(c.length) : c.slice(0, 4) + "•".repeat(Math.min(c.length - 6, 12)) + c.slice(-2));

async function refreshStock() {
  stock = (await api("/api/stock")).data;
  renderStock();
}

function renderStock() {
  const free = stock.filter((i) => !i.used).length;
  $("s-count").textContent = `${free} disponíveis · ${stock.length - free} usados`;
  const f = $("s-filter").value, show = $("s-show").checked;
  const items = stock.filter((i) => f === "all" || (f === "used" ? i.used : !i.used));
  $("s-list").innerHTML = items.length ? items.map((i) => `
    <div class="item ${i.used ? "is-used" : ""}">
      <div class="info">
        <b class="code">${esc(show ? i.code : mask(i.code))}</b>
        <small>${i.used ? `<span class="badge-st used">USADO</span>${fmt(i.usedAt)}` : `<span class="badge-st ok">DISPONÍVEL</span>`}${i.note ? " · " + esc(i.note) : ""}</small>
      </div>
      <div class="btns">
        <button class="btn ${i.used ? "" : "primary"}" data-copy="${i.id}">${i.used ? "Copiar de novo" : "Copiar"}</button>
        ${i.used ? `<button class="btn" data-unuse="${i.id}" title="Voltar para disponível">Desfazer</button>` : ""}
        <button class="btn danger" data-sdel="${i.id}">×</button>
      </div>
    </div>`).join("") : `<p class="muted">Nada por aqui.</p>`;
}

// copia para a área de transferência (com plano B para páginas sem HTTPS)
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch {}
  const ta = document.createElement("textarea");
  ta.value = t; ta.style.cssText = "position:fixed;opacity:0";
  document.body.append(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch {}
  ta.remove();
  return ok;
}

$("s-list").onclick = async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const { copy, unuse, sdel } = b.dataset;
  try {
    if (copy) {
      const item = stock.find((i) => i.id === copy);
      if (!(await copyText(item.code))) return msg("Não consegui copiar. Ative 'Mostrar códigos' e copie na mão.");
      // só marca como usado depois que a cópia deu certo; o código continua guardado
      if (!item.used) await api(`/api/stock/${copy}/use`, "POST");
      msg(item.used ? "Copiado." : "Copiado! Marcado como usado.", true);
      await refreshStock();
    } else if (unuse) {
      await api(`/api/stock/${unuse}/unuse`, "POST");
      await refreshStock();
    } else if (sdel && confirm("Excluir este código do estoque de vez?")) {
      await api(`/api/stock/${sdel}`, "DELETE");
      await refreshStock();
    }
  } catch (err) { msg(err.message); }
};

$("s-filter").onchange = $("s-show").onchange = renderStock;

$("stock-form").onsubmit = async (e) => {
  e.preventDefault();
  msg("");
  try {
    const r = await api("/api/stock", "POST", { codes: $("s-codes").value, note: $("s-note").value });
    $("s-codes").value = "";
    msg(`${r.added} código(s) guardado(s)` + (r.duplicates ? `, ${r.duplicates} repetido(s) ignorado(s).` : "."), true);
    await refreshStock();
  } catch (err) { msg(err.message); }
};

try { $("tzs").innerHTML = Intl.supportedValuesOf("timeZone").map((z) => `<option value="${z}">`).join(""); } catch {}

if (!USE_API) {
  msg("Defina apiUrl no config.js (endereço da API do servidor) para usar o painel.");
} else if (token) {
  show().catch(() => logout());
} else {
  $("login").hidden = false;
}
