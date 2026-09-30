# API de perfil (bot próprio)

1. https://discord.com/developers/applications → **New Application** → aba **Bot**.
   - Copie o **Token** (DISCORD_TOKEN).
   - Ative **Presence Intent** e **Server Members Intent**.
2. Aba **OAuth2 → URL Generator**: escopo `bot`, sem permissões. Abra a URL e adicione o bot a um servidor **seu** (crie um novo, só você e o bot).
3. Ative o modo desenvolvedor no Discord e copie o ID do servidor (GUILD_ID) e o seu (USER_ID).
4. Local: `cp .env.example .env`, preencha e rode `node --env-file=.env index.js`.
5. Deploy: precisa de processo sempre ligado (Render, Railway, Fly.io). Defina as mesmas variáveis
   de ambiente, e `ALLOWED_ORIGIN` com o endereço do seu site.
6. No `config.js` do site: `apiUrl: "https://sua-api.onrender.com"`.

Nunca coloque o token no repositório.
