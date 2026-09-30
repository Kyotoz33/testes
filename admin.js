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
  await refresh();
}

try { $("tzs").innerHTML = Intl.supportedValuesOf("timeZone").map((z) => `<option value="${z}">`).join(""); } catch {}

if (!API) {
  msg("Defina apiUrl no config.js (endereço da API do servidor) para usar o painel.");
} else if (token) {
  show().catch(() => logout());
} else {
  $("login").hidden = false;
}
