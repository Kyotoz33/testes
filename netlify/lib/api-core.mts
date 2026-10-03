// Lógica da API (login, perfis, estoque, status enviado pelo bot).
// Fica separada da função para poder ser testada sem o Netlify: tudo que vem de fora entra por `deps`.
import crypto from "node:crypto";

export interface Store {
  get(key: string, opts?: { type: "json" }): Promise<any>;
  setJSON(key: string, value: any): Promise<void>;
}
export interface Deps {
  store(name: string): Store;
  env(key: string): string | undefined;
  ip: string;
  now?: () => number;
}

const PRESENCE_STALE_MS = 10 * 60 * 1000; // sem sinal do bot por 10 min = status indisponível
const SESSION_MS = 12 * 3600 * 1000;

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
const fail = (status: number, message: string) => json({ success: false, error: { message } }, status);

const sha = (s: string) => crypto.createHash("sha256").update(String(s)).digest();
const safeEq = (a: string, b: string) => crypto.timingSafeEqual(sha(a), sha(b));

const str = (v: any, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const digits = (v: any) => (typeof v === "string" && /^\d{1,25}$/.test(v) ? v : "");
const int = (v: any) => (Number.isFinite(v) ? Math.trunc(v) : undefined);

function validTz(tz: string) {
  try { new Intl.DateTimeFormat("pt-BR", { timeZone: tz }); return true; } catch { return false; }
}

// ---------- validação de perfil ----------
function cleanProfile(b: any): { value?: any; error?: string } {
  if (!b || typeof b !== "object") return { error: "Corpo inválido" };
  const discordId = str(b.discordId, 25);
  if (!/^\d{15,25}$/.test(discordId)) return { error: "ID do Discord inválido (só números)" };
  const timezone = str(b.timezone, 60) || "America/Sao_Paulo";
  if (!validTz(timezone)) return { error: "Fuso horário inválido" };
  const bannerColor = str(b.bannerColor, 7);
  if (bannerColor && !/^#[0-9a-f]{6}$/i.test(bannerColor)) return { error: "Cor do banner inválida" };
  const links: any[] = [];
  for (const l of (Array.isArray(b.links) ? b.links.slice(0, 8) : [])) {
    const url = str(l?.url, 300);
    if (!url) continue;
    let u: URL;
    try { u = new URL(url); } catch { return { error: `Link inválido: ${url}` }; }
    if (!["http:", "https:"].includes(u.protocol)) return { error: `Link inválido: ${url}` };
    const icon = str(l.icon, 40).toLowerCase();
    if (icon && !/^[a-z0-9]+$/.test(icon)) return { error: `Ícone inválido: ${icon}` };
    links.push({ label: str(l.label, 30) || u.hostname, url: u.href, icon });
  }
  const badges = [...new Set((Array.isArray(b.badges) ? b.badges : []).map((k: any) => str(k, 30)).filter((k: string) => /^[a-z0-9_]+$/.test(k)))].slice(0, 20);
  return { value: { discordId, name: str(b.name, 40), bio: str(b.bio, 300), timezone, bannerColor, showClock: b.showClock === true, links, badges } };
}

// ---------- validação do status enviado pelo bot ----------
// O bot é de terceiros: só passa para o site o que tem formato esperado (nada de HTML/URL solta).
const idRe = /^[A-Za-z0-9_]{1,64}$/;
function cleanPresence(d: any) {
  if (!d || typeof d !== "object") return null;
  const u = d.discord_user ?? {};
  const id = digits(u.id);
  if (!id) return null;
  const status = ["online", "idle", "dnd", "offline"].includes(d.discord_status) ? d.discord_status : "offline";
  const activities = (Array.isArray(d.activities) ? d.activities.slice(0, 10) : []).map((a: any) => {
    const ts = a?.timestamps;
    return {
      type: int(a?.type) ?? 0,
      name: str(a?.name, 100),
      state: str(a?.state, 150) || undefined,
      details: str(a?.details, 150) || undefined,
      application_id: digits(a?.application_id) || undefined,
      emoji: a?.emoji?.name ? { name: str(a.emoji.name, 64) } : undefined,
      assets: typeof a?.assets?.large_image === "string" && /^[A-Za-z0-9_:.\/-]{1,200}$/.test(a.assets.large_image)
        ? { large_image: a.assets.large_image } : undefined,
      timestamps: ts ? { start: int(ts.start), end: int(ts.end) } : undefined,
    };
  });
  const sp = d.spotify;
  const art = typeof sp?.album_art_url === "string" && /^https:\/\/i\.scdn\.co\/image\/[A-Za-z0-9]+$/.test(sp.album_art_url) ? sp.album_art_url : "";
  const spotify = d.listening_to_spotify && sp && art && int(sp.timestamps?.start) !== undefined && int(sp.timestamps?.end) !== undefined
    ? { song: str(sp.song, 150), artist: str(sp.artist, 150), album_art_url: art, timestamps: { start: int(sp.timestamps.start), end: int(sp.timestamps.end) } }
    : undefined;
  return {
    in_guild: !!d.in_guild,
    // tipo de Nitro (0 nenhum, 1 Classic, 2 Nitro, 3 Basic), vindo do OAuth do bot; ausente = o bot não sabe
    premium_type: int(d.premium_type) !== undefined ? Math.min(3, Math.max(0, int(d.premium_type)!)) : undefined,
    discord_user: {
      id,
      username: str(u.username, 40),
      global_name: str(u.global_name, 40) || null,
      avatar: typeof u.avatar === "string" && idRe.test(u.avatar) ? u.avatar : null,
      banner: typeof u.banner === "string" && idRe.test(u.banner) ? u.banner : null,
      // cor de destaque da conta no Discord (#rrggbb); o site usa como cor do banner
      accent_color: typeof u.accent_color === "string" && /^#[0-9a-f]{6}$/i.test(u.accent_color) ? u.accent_color : null,
      public_flags: Math.max(0, int(u.public_flags) ?? 0),
    },
    discord_status: status,
    activities,
    listening_to_spotify: !!spotify,
    spotify,
  };
}

// ---------- login (token assinado, sem cookie) ----------
const envTrim = (deps: Deps, k: string) => (deps.env(k) ?? "").trim();

function makeAuth(deps: Deps) {
  const secret = envTrim(deps, "SESSION_SECRET");
  const now = deps.now ?? Date.now;
  const sign = (exp: string | number) => crypto.createHmac("sha256", secret).update(String(exp)).digest("hex");
  return {
    configured: !!secret && !!envTrim(deps, "ADMIN_PASSWORD"),
    make: () => { const exp = now() + SESSION_MS; return `${exp}.${sign(exp)}`; },
    valid(token: string) {
      const [exp, sig] = (token || "").split(".");
      if (!secret || !exp || !sig || Number(exp) < now()) return false;
      const a = Buffer.from(sig), b = Buffer.from(sign(exp));
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    },
  };
}

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const now = deps.now ?? Date.now;
  const url = new URL(req.url);
  const seg = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "").split("/").filter(Boolean);
  const method = req.method;
  const data = deps.store("data");
  const auth = makeAuth(deps);

  const readBody = async (max = 50_000) => {
    const text = await req.text();
    if (text.length > max) throw new Error("grande");
    return text ? JSON.parse(text) : {};
  };
  const isAdmin = () => auth.valid((req.headers.get("authorization") || "").replace(/^Bearer /, ""));
  // null = chave ok; senão a resposta de erro, dizendo se falta configurar no Netlify ou se a chave não bate
  const presenceDenied = (): Response | null => {
    const k = envTrim(deps, "PRESENCE_KEY");
    if (!k) return fail(503, "A variável PRESENCE_KEY não está configurada no Netlify (crie e faça um novo deploy)");
    return safeEq((req.headers.get("x-presence-key") || "").trim(), k) ? null : fail(401, "Chave inválida: não confere com a PRESENCE_KEY do Netlify");
  };

  try {
    // --- público ---
    // `config` mostra só se cada variável existe no deploy atual (nunca o valor): ajuda a achar o que falta
    if (seg[0] === "info" && method === "GET") {
      return json({
        success: true, invites: false, presence: "push",
        config: { ADMIN_PASSWORD: !!envTrim(deps, "ADMIN_PASSWORD"), SESSION_SECRET: !!envTrim(deps, "SESSION_SECRET"), PRESENCE_KEY: !!envTrim(deps, "PRESENCE_KEY") },
      });
    }

    if (seg[0] === "profiles" && seg.length === 1 && method === "GET") {
      const profiles: any[] = (await data.get("profiles", { type: "json" })) ?? [];
      const pres = await data.get("presence", { type: "json" });
      const fresh = pres && now() - pres.at < PRESENCE_STALE_MS;
      const list = profiles.map((p) => ({ ...p, discord: (fresh && pres.users?.[p.discordId]) || null }));
      // o site (sem ?t=) é servido pelo cache da CDN por 10 s; o painel usa ?t= e vê o dado novo
      return json({ success: true, data: list }, 200, { "Netlify-CDN-Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" });
    }

    // --- login ---
    if (seg[0] === "login" && method === "POST") {
      if (!envTrim(deps, "ADMIN_PASSWORD")) return fail(503, "A variável ADMIN_PASSWORD não está configurada no Netlify (crie e faça um novo deploy)");
      if (!auth.configured) return fail(503, "A variável SESSION_SECRET não está configurada no Netlify (crie e faça um novo deploy)");
      const ipKey = "fails-" + crypto.createHash("sha256").update(deps.ip || "?").digest("hex").slice(0, 16);
      const auths = deps.store("auth");
      const f = await auths.get(ipKey, { type: "json" });
      if (f && f.n >= 5 && f.until > now()) return fail(429, "Muitas tentativas. Tente de novo em alguns minutos.");
      const body = await readBody(2_000);
      if (safeEq(String(body?.password ?? "").trim(), envTrim(deps, "ADMIN_PASSWORD"))) {
        if (f) await auths.setJSON(ipKey, { n: 0, until: 0 });
        return json({ success: true, token: auth.make() });
      }
      await auths.setJSON(ipKey, { n: (f && f.until > now() ? f.n : 0) + 1, until: now() + 10 * 60 * 1000 });
      return fail(401, "Senha incorreta");
    }

    // --- bot envia o status (chave própria, sem acesso ao resto) ---
    if (seg[0] === "presence-ids" && method === "GET") {
      const denied = presenceDenied();
      if (denied) return denied;
      const profiles: any[] = (await data.get("profiles", { type: "json" })) ?? [];
      return json({ success: true, ids: profiles.map((p) => p.discordId) });
    }
    if (seg[0] === "presence" && method === "POST") {
      const denied = presenceDenied();
      if (denied) return denied;
      const body = await readBody(300_000);
      const profiles: any[] = (await data.get("profiles", { type: "json" })) ?? [];
      const wanted = new Set(profiles.map((p) => p.discordId));
      const users: Record<string, any> = {};
      for (const [id, v] of Object.entries(body?.users ?? {})) {
        if (!wanted.has(id)) continue;
        const c = cleanPresence(v);
        if (c && c.discord_user.id === id) users[id] = c;
      }
      await data.setJSON("presence", { at: now(), users });
      return json({ success: true, accepted: Object.keys(users).length });
    }

    // --- tudo abaixo exige login ---
    if (!isAdmin()) return fail(401, "Não autorizado");

    if (seg[0] === "profiles") {
      const profiles: any[] = (await data.get("profiles", { type: "json" })) ?? [];
      if (method === "POST" && seg.length === 1) {
        const { value, error } = cleanProfile(await readBody());
        if (error) return fail(400, error);
        if (profiles.length >= 24) return fail(400, "Limite de 24 perfis");
        if (profiles.some((p) => p.discordId === value.discordId)) return fail(409, "Esse ID já está cadastrado");
        const profile = { id: crypto.randomUUID(), ...value };
        await data.setJSON("profiles", [...profiles, profile]);
        return json({ success: true, data: profile }, 201);
      }
      const i = profiles.findIndex((p) => p.id === seg[1]);
      if (seg.length === 2 && method === "PUT") {
        if (i < 0) return fail(404, "Perfil não encontrado");
        const { value, error } = cleanProfile(await readBody());
        if (error) return fail(400, error);
        if (profiles.some((p, j) => j !== i && p.discordId === value.discordId)) return fail(409, "Esse ID já está cadastrado");
        profiles[i] = { id: profiles[i].id, ...value };
        await data.setJSON("profiles", profiles);
        return json({ success: true, data: profiles[i] });
      }
      if (seg.length === 2 && method === "DELETE") {
        if (i < 0) return fail(404, "Perfil não encontrado");
        profiles.splice(i, 1);
        await data.setJSON("profiles", profiles);
        return json({ success: true });
      }
    }

    if (seg[0] === "stock") {
      const stock: any[] = (await data.get("stock", { type: "json" })) ?? [];
      if (seg.length === 1 && method === "GET") return json({ success: true, data: stock });
      if (seg.length === 1 && method === "POST") {
        const b = await readBody(100_000);
        const note = typeof b?.note === "string" ? b.note.trim().slice(0, 60) : "";
        const raw = Array.isArray(b?.codes) ? b.codes : String(b?.codes ?? "").split(/\r?\n/);
        const codes = [...new Set(raw.map((c: any) => String(c).trim()).filter(Boolean))] as string[];
        if (!codes.length) return fail(400, "Cole ao menos um código");
        if (codes.length > 200) return fail(400, "Máximo de 200 códigos por vez");
        if (codes.some((c) => c.length > 200)) return fail(400, "Código muito longo");
        const have = new Set(stock.map((x) => x.code));
        const fresh = codes.filter((c) => !have.has(c));
        if (stock.length + fresh.length > 5000) return fail(400, "Limite de 5000 códigos");
        const t = now();
        stock.push(...fresh.map((code) => ({ id: crypto.randomUUID(), code, note, used: false, usedAt: null, createdAt: t })));
        await data.setJSON("stock", stock);
        return json({ success: true, added: fresh.length, duplicates: codes.length - fresh.length }, 201);
      }
      const item = stock.find((x) => x.id === seg[1]);
      if (seg.length === 3 && method === "POST" && (seg[2] === "use" || seg[2] === "unuse")) {
        if (!item) return fail(404, "Código não encontrado");
        if (seg[2] === "use") {
          // idempotente: se já estava usado, não muda a data
          if (!item.used) { item.used = true; item.usedAt = now(); await data.setJSON("stock", stock); }
        } else {
          item.used = false; item.usedAt = null;
          await data.setJSON("stock", stock);
        }
        return json({ success: true, data: item });
      }
      if (seg.length === 2 && method === "DELETE") {
        if (!item) return fail(404, "Código não encontrado");
        await data.setJSON("stock", stock.filter((x) => x !== item));
        return json({ success: true });
      }
    }

    return fail(404, "Rota não encontrada");
  } catch (e: any) {
    if (e instanceof SyntaxError || e?.message === "grande") return fail(400, "Requisição inválida");
    console.error(e);
    return fail(500, "Erro interno");
  }
}
