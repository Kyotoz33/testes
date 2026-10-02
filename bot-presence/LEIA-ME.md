# Adicionar o envio de status ao seu bot

Duas versões: **Python (discord.py 2.x)** logo abaixo, e **Node (discord.js v14)** mais adiante.

Isto faz o bot mandar, a cada poucos segundos, o status (online/ausente, jogo, Spotify) das pessoas
cadastradas no site. **O bot não abre porta, não precisa de domínio e não recebe nenhum dado**; só envia.
Nada do site (senha, estoque) fica acessível ao bot: a chave só permite enviar status e ler a lista de IDs.

## Python (discord.py 2.x)
1. Copie `presence_push.py` para a mesma pasta do `main.py`.
2. No `main.py`, depois de criar o `bot`/`client`:
   ```python
   import os
   from presence_push import start_presence_push

   start_presence_push(bot, url="https://tremdaselva.cc", key=os.environ["PRESENCE_KEY"])
   ```
3. Os intents precisam incluir membros e presenças:
   ```python
   intents = discord.Intents.default()
   intents.members = True
   intents.presences = True
   ```
4. Guarde a chave na variável de ambiente `PRESENCE_KEY` da hospedagem do bot (nunca no código).
5. No portal do Discord (aba **Bot**), ative **Presence Intent** e **Server Members Intent**.

Não precisa instalar nada: usa o `aiohttp`, que já vem com o discord.py. Erros aparecem no console com `[presence-push]`.

## Node (discord.js v14)
1. Copie `presence-push.js` para a pasta do bot.
2. No arquivo principal do bot, depois de criar o `client`:
   ```js
   const startPresencePush = require("./presence-push.js");
   startPresencePush(client, {
     url: "https://tremdaselva.cc",          // endereço do site
     key: process.env.PRESENCE_KEY,          // chave que o dono do site passou
   });
   ```
3. Guarde a chave numa variável de ambiente (`PRESENCE_KEY`), nunca no código.
4. No portal do Discord (aba **Bot**), ative **Presence Intent** e **Server Members Intent**, e no código
   inclua `GatewayIntentBits.Guilds`, `GuildMembers` e `GuildPresences` nos `intents` do `Client`.
5. As pessoas a mostrar precisam estar em um servidor onde o bot esteja (o Discord só informa o status nesse caso).

Requer Node 18+ (usa `fetch`). Se o bot passar de 100 servidores, o Discord exige verificação para os intents acima.
Erros aparecem no console com o prefixo `[presence-push]`.
