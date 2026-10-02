// Envia o status (online, jogo, Spotify...) das pessoas do site para o site.
// Para bots em discord.js v14, Node 18+. O bot só FAZ requisições; não precisa abrir porta nem ter domínio.
//
// Uso (no arquivo principal do bot, depois de criar o `client`):
//   const startPresencePush = require("./presence-push.js");
//   startPresencePush(client, { url: "https://tremdaselva.cc", key: process.env.PRESENCE_KEY });
//
// Requisitos do bot: no portal do Discord, ativar "Presence Intent" e "Server Members Intent"
// e declarar no código GatewayIntentBits.Guilds, GuildMembers e GuildPresences.
module.exports = function startPresencePush(client, { url, key, every = 15000 }) {
  if (!url || !key) throw new Error("presence-push: informe url e key");
  const base = url.replace(/\/$/, "");
  const headers = { "Content-Type": "application/json", "X-Presence-Key": key };
  const ms = (d) => (d ? new Date(d).getTime() : undefined);

  const userCache = new Map(); // id -> { at, user }  (avatar/banner/emblemas mudam pouco)
  const missing = new Map();   // id -> quando não achamos a pessoa em nenhum servidor do bot
  let ids = [], idsAt = 0, last = "", lastSent = 0, started = false;

  async function getUser(id) {
    const c = userCache.get(id);
    if (c && Date.now() - c.at < 30 * 60 * 1000) return c.user;
    const user = await client.users.fetch(id, { force: true }).catch(() => null);
    if (user) userCache.set(id, { at: Date.now(), user });
    return user;
  }

  // procura a pessoa em qualquer servidor onde o bot esteja
  async function findMember(id) {
    for (const g of client.guilds.cache.values()) {
      const m = g.members.cache.get(id);
      if (m) return m;
    }
    if (Date.now() - (missing.get(id) || 0) < 10 * 60 * 1000) return null; // não insiste a cada ciclo
    for (const g of client.guilds.cache.values()) {
      const m = await g.members.fetch({ user: id, withPresences: true }).catch(() => null);
      if (m) { missing.delete(id); return m; }
    }
    missing.set(id, Date.now());
    return null;
  }

  async function build(id) {
    const member = await findMember(id);
    const user = (await getUser(id)) || member?.user;
    if (!user) return null;
    const presence = member?.presence;
    const acts = presence?.activities ?? [];
    const sp = acts.find((a) => a.name === "Spotify" && a.type === 2);
    return {
      in_guild: !!member,
      discord_user: {
        id: user.id, username: user.username, global_name: user.globalName,
        avatar: user.avatar, banner: user.banner, public_flags: user.flags?.bitfield ?? 0,
      },
      discord_status: presence?.status ?? "offline",
      activities: acts.map((a) => ({
        type: a.type, name: a.name, state: a.state, details: a.details,
        application_id: a.applicationId,
        emoji: a.emoji ? { name: a.emoji.name } : undefined,
        assets: a.assets ? { large_image: a.assets.largeImage } : undefined,
        timestamps: a.timestamps ? { start: ms(a.timestamps.start), end: ms(a.timestamps.end) } : undefined,
      })),
      listening_to_spotify: !!sp,
      spotify: sp && {
        song: sp.details, artist: sp.state,
        album_art_url: sp.assets?.largeImage?.replace("spotify:", "https://i.scdn.co/image/"),
        timestamps: { start: ms(sp.timestamps?.start), end: ms(sp.timestamps?.end) },
      },
    };
  }

  async function tick() {
    try {
      if (Date.now() - idsAt > 60000) { // lista de pessoas do site (muda quando você edita o painel)
        const r = await fetch(base + "/api/presence-ids", { headers });
        const j = await r.json();
        if (!j.success) throw new Error(j.error?.message || "HTTP " + r.status);
        ids = j.ids; idsAt = Date.now();
      }
      const users = {};
      for (const id of ids) users[id] = await build(id).catch(() => null);
      const body = JSON.stringify({ users });
      // só envia se mudou (ou a cada 4 min, para o site saber que o bot está vivo)
      if (body !== last || Date.now() - lastSent > 4 * 60 * 1000) {
        const r = await fetch(base + "/api/presence", { method: "POST", headers, body });
        if (!r.ok) throw new Error("HTTP " + r.status);
        last = body; lastSent = Date.now();
      }
    } catch (e) {
      console.error("[presence-push]", e.message);
    }
  }

  const start = () => {
    if (started) return;
    started = true;
    tick();
    setInterval(tick, every);
  };
  if (client.isReady?.()) start();
  else { client.once("ready", start); client.once("clientReady", start); }
};
