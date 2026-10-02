# Adicionar o envio de status ao seu bot (discord.js v14)

Isto faz o bot mandar, a cada poucos segundos, o status (online/ausente, jogo, Spotify) das pessoas
cadastradas no site. **O bot não abre porta, não precisa de domínio e não recebe nenhum dado**; só envia.
Nada do site (senha, estoque) fica acessível ao bot: a chave só permite enviar status e ler a lista de IDs.

## Passos
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
