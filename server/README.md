# API de perfis + painel

O servidor guarda os perfis (arquivo JSON), busca status/atividade no Discord via bot
e expõe a API que o site e o painel `admin.html` usam.

## 1. Bot do Discord
1. https://discord.com/developers/applications → **New Application** → aba **Bot**.
   - Copie o **Token** (DISCORD_TOKEN).
   - Ative **Presence Intent** e **Server Members Intent**.
2. **OAuth2 → URL Generator**: escopo `bot`, sem permissões. Adicione o bot a um servidor
   **onde estejam todas as pessoas que você quer mostrar** (o Discord só informa status de quem
   está em um servidor em comum com o bot). Copie o ID do servidor (GUILD_ID).

## 2. Variáveis de ambiente
Veja `.env.example`. As principais:
- `ADMIN_PASSWORD`: senha do painel. **Escolha uma forte.**
- `SESSION_SECRET`: texto aleatório longo (mantém o login após reiniciar).
- `DISCORD_TOKEN`, `GUILD_ID`.
- `ALLOWED_ORIGIN`: endereço do seu site (ex.: `https://seusite.netlify.app`).
- `DATA_FILE`: onde salvar os perfis. **Precisa ser um disco persistente**; em hospedagens que
  apagam o disco a cada deploy, os perfis somem.

## 3. Rodar
```
npm install
node --env-file=.env index.js
```
Deploy: precisa de processo sempre ligado (Railway, Fly.io ou VPS, com volume para o `DATA_FILE`).

## 4. Site
No `config.js` do site, preencha `apiUrl` com o endereço do servidor. Depois abra
`admin.html`, entre com a senha e cadastre/edite perfis. O site atualiza sozinho (até 10 s).

Nunca coloque o token nem a senha no repositório.

## Segurança
- Login com senha, token assinado que expira em 12 h, bloqueio após 5 tentativas erradas.
- Só links `http/https` são aceitos; textos são escapados no site.
- Leitura de perfis é pública; criar/editar/excluir exige login.
