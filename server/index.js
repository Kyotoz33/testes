import express from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client, GatewayIntentBits, ChannelType } from "discord.js";

const {
  DISCORD_TOKEN, GUILD_ID, USER_ID, ADMIN_PASSWORD,
  SESSION_SECRET = crypto.randomBytes(32).toString("hex"), // sem valor fixo, o login expira a cada reinício
  ALLOWED_ORIGIN = "*", PORT = 3000, HOST = "0.0.0.0", DATA_FILE = "./data/profiles.json", STOCK_FILE = "./data/stock.json",
} = process.env;

if (!ADMIN_PASSWORD) {
  console.error("Defina ADMIN_PASSWORD (senha do painel). Veja .env.example.");
  process.exit(1);
}

// ---------- Discord ----------
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences],
});
if (DISCORD_TOKEN && GUILD_ID) {
  client.login(DISCORD_TOKEN);
  client.once("ready", () => console.log(`Bot online como ${client.user.tag}`));
} else {
  console.warn("DISCORD_TOKEN/GUILD_ID ausentes: rodando sem dados do Discord (só o painel).");
}

const ms = (d) => (d ? new Date(d).getTime() : undefined);

function mapActivity(a) {
  return {
    type: a.type,
    name: a.name,
    state: a.state,
    details: a.details,
    application_id: a.applicationId,
    emoji: a.emoji ? { name: a.emoji.name, id: a.emoji.id } : undefined,
    assets: a.assets ? { large_image: a.assets.largeImage } : undefined,
    timestamps: a.timestamps ? { start: ms(a.timestamps.start), end: ms(a.timestamps.end) } : undefined,
  };
}

// dados do usuário (avatar, banner, emblemas) mudam pouco: cache de 5 min
const userCache = new Map();
async function getUser(id) {
  const c = userCache.get(id);
  if (c && Date.now() - c.at < 300000) return c.user;
  const user = await client.users.fetch(id, { force: true });
  userCache.set(id, { at: Date.now(), user });
  return user;
}

async function getDiscord(id) {
  if (!client.isReady()) return null;
  try {
    const user = await getUser(id);
    const guild = await client.guilds.fetch(GUILD_ID);
    // membros em cache recebem as atualizações de presença pelo gateway
    const member = guild.members.cache.get(id) ?? (await guild.members.fetch({ user: id, withPresences: true }).catch(() => null));
    const presence = member?.presence;
    const acts = presence?.activities ?? [];
    const sp = acts.find((a) => a.name === "Spotify" && a.type === 2);
    return {
      in_guild: !!member, // false = o bot não enxerga essa pessoa (não está no servidor): sem status ao vivo
      discord_user: {
        id: user.id, username: user.username, global_name: user.globalName,
        avatar: user.avatar, banner: user.banner, public_flags: user.flags?.bitfield ?? 0,
      },
      discord_status: presence?.status ?? "offline",
      activities: acts.map(mapActivity),
      listening_to_spotify: !!sp,
      spotify: sp && {
        song: sp.details,
        artist: sp.state,
        album_art_url: sp.assets?.largeImage?.replace("spotify:", "https://i.scdn.co/image/"),
        timestamps: { start: ms(sp.timestamps?.start), end: ms(sp.timestamps?.end) },
      },
    };
  } catch (e) {
    console.error("Falha ao buscar", id, e.message);
    return null;
  }
}

// ---------- armazenamento (arquivos JSON) ----------
// escrita atômica (arquivo temporário + rename), uma de cada vez por arquivo
function makeWriter(file) {
  let chain = Promise.resolve();
  return (data) => {
    chain = chain.then(async () => {
      await fs.mkdir(path.dirname(file), { recursive: true });
      const tmp = file + ".tmp";
      await fs.writeFile(tmp, JSON.stringify(data, null, 2));
      await fs.rename(tmp, file);
    });
    return chain;
  };
}
const writeProfiles = makeWriter(DATA_FILE);
const writeStock = makeWriter(STOCK_FILE);

let profiles = [];
let stock = [];
const save = () => writeProfiles(profiles);
const saveStock = () => writeStock(stock);

async function load() {
  try {
    profiles = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
  } catch {
    profiles = USER_ID ? [{ id: crypto.randomUUID(), discordId: USER_ID, name: "", bio: "", timezone: "America/Sao_Paulo", bannerColor: "#5865f2", links: [] }] : [];
    await save();
  }
  try {
    stock = JSON.parse(await fs.readFile(STOCK_FILE, "utf8"));
  } catch {
    stock = [];
  }
}

function validTz(tz) {
  try { new Intl.DateTimeFormat("pt-BR", { timeZone: tz }); return true; } catch { return false; }
}

function clean(b) {
  if (!b || typeof b !== "object") return { error: "Corpo inválido" };
  const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const discordId = str(b.discordId, 25);
  if (!/^\d{15,25}$/.test(discordId)) return { error: "ID do Discord inválido (só números)" };
  const timezone = str(b.timezone, 60) || "America/Sao_Paulo";
  if (!validTz(timezone)) return { error: "Fuso horário inválido" };
  const bannerColor = str(b.bannerColor, 7);
  if (bannerColor && !/^#[0-9a-f]{6}$/i.test(bannerColor)) return { error: "Cor do banner inválida" };
  const rawLinks = Array.isArray(b.links) ? b.links.slice(0, 8) : [];
  const links = [];
  for (const l of rawLinks) {
    const url = str(l?.url, 300);
    if (!url) continue;
    let u;
    try { u = new URL(url); } catch { return { error: `Link inválido: ${url}` }; }
    if (!["http:", "https:"].includes(u.protocol)) return { error: `Link inválido: ${url}` };
    const icon = str(l.icon, 40).toLowerCase();
    if (icon && !/^[a-z0-9]+$/.test(icon)) return { error: `Ícone inválido: ${icon}` };
    links.push({ label: str(l.label, 30) || u.hostname, url: u.href, icon });
  }
  const badges = [...new Set((Array.isArray(b.badges) ? b.badges : []).map((k) => str(k, 30)).filter((k) => /^[a-z0-9_]+$/.test(k)))].slice(0, 20);
  return { value: { discordId, name: str(b.name, 40), bio: str(b.bio, 300), timezone, bannerColor, links, badges } };
}

// ---------- login ----------
const sign = (exp) => crypto.createHmac("sha256", SESSION_SECRET).update(String(exp)).digest("hex");
const makeToken = () => { const exp = Date.now() + 12 * 3600 * 1000; return `${exp}.${sign(exp)}`; };
function validToken(t = "") {
  const [exp, sig] = t.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();

const fails = new Map(); // ip -> { n, until }
function auth(req, res, next) {
  if (validToken((req.headers.authorization || "").replace(/^Bearer /, ""))) return next();
  res.status(401).json({ success: false, error: { message: "Não autorizado" } });
}

// ---------- API ----------
const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "50kb" }));
// ALLOWED_ORIGIN: "*" ou uma lista separada por vírgulas (ex.: https://meusite.com,https://www.meusite.com)
const ORIGINS = ALLOWED_ORIGIN.split(",").map((o) => o.trim().replace(/\/$/, "")).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ORIGINS.includes("*")) res.set("Access-Control-Allow-Origin", "*");
  else if (origin && ORIGINS.includes(origin)) res.set({ "Access-Control-Allow-Origin": origin, Vary: "Origin" });
  res.set({
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const fail = (res, code, message) => res.status(code).json({ success: false, error: { message } });

// serve o site pelo próprio servidor (mesma origem: sem CORS e sem domínio à parte).
// Lista fixa de arquivos: nada de server/ (.env, dados) fica exposto.
const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE_FILES = new Set(["index.html", "admin.html", "app.js", "admin.js", "bg.js", "badges.js", "config.js", "style.css", "admin.css"]);
app.get("/badges/:file", (req, res, next) => { // ícones dos emblemas (lista fixa de formatos)
  if (!/^[a-z0-9-]+\.(png|svg)$/.test(req.params.file)) return next();
  res.sendFile(path.join(SITE, "badges", req.params.file));
});
app.get("/:file?", (req, res, next) => {
  const f = req.params.file || "index.html";
  if (!SITE_FILES.has(f)) return next();
  res.sendFile(path.join(SITE, f));
});

app.post("/api/login", (req, res) => {
  const f = fails.get(req.ip);
  if (f && f.n >= 5 && f.until > Date.now()) return fail(res, 429, "Muitas tentativas. Tente de novo em alguns minutos.");
  if (crypto.timingSafeEqual(sha(req.body?.password ?? ""), sha(ADMIN_PASSWORD))) {
    fails.delete(req.ip);
    return res.json({ success: true, token: makeToken() });
  }
  fails.set(req.ip, { n: (f?.n ?? 0) + 1, until: Date.now() + 10 * 60 * 1000 });
  fail(res, 401, "Senha incorreta");
});

app.get("/api/profiles", async (_, res) => {
  const data = await Promise.all(profiles.map(async (p) => ({ ...p, discord: await getDiscord(p.discordId) })));
  res.json({ success: true, data });
});

app.post("/api/profiles", auth, async (req, res) => {
  const { value, error } = clean(req.body);
  if (error) return fail(res, 400, error);
  if (profiles.length >= 24) return fail(res, 400, "Limite de 24 perfis");
  if (profiles.some((p) => p.discordId === value.discordId)) return fail(res, 409, "Esse ID já está cadastrado");
  const profile = { id: crypto.randomUUID(), ...value };
  profiles.push(profile);
  await save();
  res.status(201).json({ success: true, data: profile });
});

app.put("/api/profiles/:id", auth, async (req, res) => {
  const i = profiles.findIndex((p) => p.id === req.params.id);
  if (i < 0) return fail(res, 404, "Perfil não encontrado");
  const { value, error } = clean(req.body);
  if (error) return fail(res, 400, error);
  if (profiles.some((p, j) => j !== i && p.discordId === value.discordId)) return fail(res, 409, "Esse ID já está cadastrado");
  profiles[i] = { id: profiles[i].id, ...value };
  await save();
  res.json({ success: true, data: profiles[i] });
});

app.delete("/api/profiles/:id", auth, async (req, res) => {
  const i = profiles.findIndex((p) => p.id === req.params.id);
  if (i < 0) return fail(res, 404, "Perfil não encontrado");
  profiles.splice(i, 1);
  await save();
  res.json({ success: true });
});

app.get("/api/info", (_, res) => res.json({ success: true, invites: true, presence: "bot" }));

// ---------- convites (só com login) ----------
// link para autorizar o bot em outro servidor (permissão mínima: criar convite)
app.get("/api/bot-invite", auth, (_, res) => {
  if (!client.isReady()) return fail(res, 503, "Bot offline");
  res.json({ success: true, url: `https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=1` });
});

// cria um convite permanente para o servidor do bot (para mandar às pessoas que quer mostrar)
app.post("/api/guild-invite", auth, async (_, res) => {
  if (!client.isReady()) return fail(res, 503, "Bot offline");
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const me = await guild.members.fetchMe();
    const channels = await guild.channels.fetch();
    const ch = channels.find((c) => c?.type === ChannelType.GuildText && c.permissionsFor(me)?.has("CreateInstantInvite"));
    if (!ch) return fail(res, 403, "O bot não tem a permissão 'Criar convite'. Reautorize o bot com o link do painel.");
    const inv = await ch.createInvite({ maxAge: 0, maxUses: 0, unique: false, reason: "Painel de perfis" });
    res.json({ success: true, url: inv.url });
  } catch (e) {
    console.error(e);
    fail(res, 500, "Não consegui criar o convite");
  }
});

// ---------- estoque de códigos (só com login) ----------
app.get("/api/stock", auth, (_, res) => res.json({ success: true, data: stock }));

app.post("/api/stock", auth, async (req, res) => {
  const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 60) : "";
  const raw = Array.isArray(req.body?.codes) ? req.body.codes : String(req.body?.codes ?? "").split(/\r?\n/);
  const codes = [...new Set(raw.map((c) => String(c).trim()).filter(Boolean))];
  if (!codes.length) return fail(res, 400, "Cole ao menos um código");
  if (codes.length > 200) return fail(res, 400, "Máximo de 200 códigos por vez");
  if (codes.some((c) => c.length > 200)) return fail(res, 400, "Código muito longo");
  const have = new Set(stock.map((i) => i.code));
  const fresh = codes.filter((c) => !have.has(c));
  if (stock.length + fresh.length > 5000) return fail(res, 400, "Limite de 5000 códigos");
  const now = Date.now();
  stock.push(...fresh.map((code) => ({ id: crypto.randomUUID(), code, note, used: false, usedAt: null, createdAt: now })));
  await saveStock();
  res.status(201).json({ success: true, added: fresh.length, duplicates: codes.length - fresh.length });
});

// marca como usado (mantém guardado); idempotente: não muda a data se já estava usado
app.post("/api/stock/:id/use", auth, async (req, res) => {
  const item = stock.find((i) => i.id === req.params.id);
  if (!item) return fail(res, 404, "Código não encontrado");
  if (!item.used) { item.used = true; item.usedAt = Date.now(); await saveStock(); }
  res.json({ success: true, data: item });
});

app.post("/api/stock/:id/unuse", auth, async (req, res) => {
  const item = stock.find((i) => i.id === req.params.id);
  if (!item) return fail(res, 404, "Código não encontrado");
  item.used = false; item.usedAt = null;
  await saveStock();
  res.json({ success: true, data: item });
});

app.delete("/api/stock/:id", auth, async (req, res) => {
  const i = stock.findIndex((x) => x.id === req.params.id);
  if (i < 0) return fail(res, 404, "Código não encontrado");
  stock.splice(i, 1);
  await saveStock();
  res.json({ success: true });
});

app.use((err, _req, res, _next) => {
  if (!err.status || err.status >= 500) console.error(err);
  fail(res, err.status || 500, err.status === 400 ? "JSON inválido" : "Erro interno");
});

await load();
app.listen(PORT, HOST, () => console.log(`Site e API em http://${HOST}:${PORT}`));
