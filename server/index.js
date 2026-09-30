import express from "express";
import { Client, GatewayIntentBits } from "discord.js";

const { DISCORD_TOKEN, GUILD_ID, USER_ID, ALLOWED_ORIGIN = "*", PORT = 3000 } = process.env;
if (!DISCORD_TOKEN || !GUILD_ID || !USER_ID) {
  console.error("Defina DISCORD_TOKEN, GUILD_ID e USER_ID (veja .env.example).");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences],
});
client.login(DISCORD_TOKEN);
client.once("ready", () => console.log(`Bot online como ${client.user.tag}`));

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

async function getProfile() {
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch({ user: USER_ID, force: true, withPresences: true });
  const user = await client.users.fetch(USER_ID, { force: true });
  const presence = member.presence;
  const acts = presence?.activities ?? [];
  const sp = acts.find((a) => a.name === "Spotify" && a.type === 2);

  return {
    discord_user: {
      id: user.id,
      username: user.username,
      global_name: user.globalName,
      avatar: user.avatar,
      banner: user.banner,
      public_flags: user.flags?.bitfield ?? 0,
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
}

// cache curto para não estourar limites do Discord se o site tiver muitos acessos
let cache = { at: 0, data: null };

const app = express();
app.use((_, res, next) => {
  res.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  next();
});
app.get("/", (_, res) => res.send("API de perfil online. Use /api/profile"));
app.get("/api/profile", async (_, res) => {
  try {
    if (Date.now() - cache.at > 5000) cache = { at: Date.now(), data: await getProfile() };
    res.json({ success: true, data: cache.data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: { message: "Falha ao buscar perfil" } });
  }
});
app.listen(PORT, () => console.log(`API em http://localhost:${PORT}`));
