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
  profiles = (await api("/api/profiles")).data;
  $("list").innerHTML = profiles.length ? profiles.map((p) => {
    const u = p.discord?.discord_user;
    const av = u?.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64` : "";
    return `<div class="item">${av ? `<img src="${av}" alt="">` : `<div class="noav"></div>`}
      <div class="info"><b>${esc(p.name || u?.global_name || u?.username || "Perfil")}</b><small>${esc(p.discordId)}</small></div>
      <div class="btns"><button class="btn" data-edit="${p.id}">Editar</button><button class="btn danger" data-del="${p.id}">Excluir</button></div></div>`;
  }).join("") : `<p class="muted">Nenhum perfil ainda.</p>`;
}

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
  $("f-color").value = p?.bannerColor || "#5865f2";
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
    bannerColor: $("f-color").value,
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
  await Promise.all([refresh(), refreshStock()]);
}

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
