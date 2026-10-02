"""Envia o status (online, jogo, Spotify...) das pessoas do site para o site.

Para bots em discord.py 2.x. O bot só FAZ requisições: não abre porta nem precisa de domínio.
Usa o aiohttp, que já vem junto com o discord.py (não precisa instalar nada).

Uso (no arquivo principal, depois de criar o `bot`/`client`):
    from presence_push import start_presence_push
    start_presence_push(bot, url="https://tremdaselva.cc", key=os.environ["PRESENCE_KEY"])

Requisitos: no portal do Discord (aba Bot) ative "Presence Intent" e "Server Members Intent",
e no código:  intents.members = True  e  intents.presences = True
"""
import asyncio
import json
import time

import aiohttp
import discord


def start_presence_push(client, url, key, every=15):
    base = url.rstrip("/")
    headers = {"Content-Type": "application/json", "X-Presence-Key": key}
    state = {"started": False, "ids": [], "ids_at": 0.0, "last": "", "sent_at": 0.0}
    users = {}  # id -> (quando buscou, user): avatar/banner/emblemas mudam pouco

    def ms(dt):
        return int(dt.timestamp() * 1000) if dt else None

    async def get_user(uid):
        hit = users.get(uid)
        if hit and time.time() - hit[0] < 1800:
            return hit[1]
        try:
            user = await client.fetch_user(int(uid))
        except Exception:
            return hit[1] if hit else None
        users[uid] = (time.time(), user)
        return user

    def find_member(uid):
        for guild in client.guilds:
            member = guild.get_member(int(uid))
            if member:
                return member
        return None

    def map_activity(a):
        t = getattr(getattr(a, "type", None), "value", 0)
        if isinstance(a, discord.CustomActivity):
            emoji = getattr(a, "emoji", None)
            return {"type": 4, "name": "Custom Status", "state": a.name,
                    "emoji": {"name": emoji.name} if emoji and emoji.name else None}
        if isinstance(a, discord.Spotify):
            return {"type": 2, "name": "Spotify"}
        assets = getattr(a, "assets", None) or {}
        return {
            "type": t,
            "name": getattr(a, "name", None),
            "state": getattr(a, "state", None),
            "details": getattr(a, "details", None),
            "application_id": str(a.application_id) if getattr(a, "application_id", None) else None,
            "assets": {"large_image": assets["large_image"]} if assets.get("large_image") else None,
            "timestamps": {"start": ms(getattr(a, "start", None)), "end": ms(getattr(a, "end", None))}
            if getattr(a, "start", None) or getattr(a, "end", None) else None,
        }

    async def build(uid):
        member = find_member(uid)
        user = await get_user(uid) or (member._user if member else None)
        if not user:
            return None
        acts = list(member.activities) if member else []
        spotify = next((a for a in acts if isinstance(a, discord.Spotify)), None)
        return {
            "in_guild": member is not None,
            "discord_user": {
                "id": str(user.id),
                "username": user.name,
                "global_name": user.global_name,
                "avatar": user.avatar.key if user.avatar else None,
                "banner": user.banner.key if getattr(user, "banner", None) else None,
                "public_flags": user.public_flags.value,
            },
            "discord_status": member.status.value if member else "offline",
            "activities": [map_activity(a) for a in acts],
            "listening_to_spotify": spotify is not None,
            "spotify": {
                "song": spotify.title,
                "artist": spotify.artist,
                "album_art_url": spotify.album_cover_url,
                "timestamps": {"start": ms(spotify.start), "end": ms(spotify.end)},
            } if spotify else None,
        }

    async def tick(session):
        try:
            if time.time() - state["ids_at"] > 60:  # lista de pessoas do site (muda no painel)
                async with session.get(base + "/api/presence-ids", headers=headers) as r:
                    j = await r.json()
                    if not j.get("success"):
                        raise RuntimeError(j.get("error", {}).get("message") or f"HTTP {r.status}")
                    state["ids"], state["ids_at"] = j["ids"], time.time()
            out = {}
            for uid in state["ids"]:
                try:
                    out[uid] = await build(uid)
                except Exception:
                    out[uid] = None
            body = json.dumps({"users": out}, sort_keys=True)
            # só envia se mudou (ou a cada 4 min, para o site saber que o bot está vivo)
            if body != state["last"] or time.time() - state["sent_at"] > 240:
                async with session.post(base + "/api/presence", headers=headers, data=body) as r:
                    if r.status != 200:
                        raise RuntimeError(f"HTTP {r.status}")
                state["last"], state["sent_at"] = body, time.time()
        except Exception as e:
            print("[presence-push]", e)

    async def run():
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=20)) as session:
            while True:
                await tick(session)
                await asyncio.sleep(every)

    async def on_ready():  # listener extra: não substitui o on_ready do seu bot
        if not state["started"]:
            state["started"] = True
            asyncio.create_task(run())

    client.add_listener(on_ready, "on_ready")
