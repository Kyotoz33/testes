# Site de perfis do Discord

Site com cartões de perfil (estilo Discord), painel de administração e estoque de códigos.
Hospedagem 100% no **Netlify** (grátis). O status ao vivo vem de um **bot do Discord** de quem você quiser
(por exemplo, um amigo): o bot só *envia* os dados para o seu site.

```
 Discord ──► bot (de qualquer pessoa) ──envia──► seu site no Netlify ◄── visitantes / painel
                                                  (funções + armazenamento)
```

## Configurar (uma vez)
1. **Netlify → Site configuration → Environment variables**: crie
   - `ADMIN_PASSWORD` = a senha do painel (escolha uma forte)
   - `SESSION_SECRET` e `PRESENCE_KEY` (já criadas; a `PRESENCE_KEY` é o que o dono do bot precisa)
2. Faça um novo deploy (*Deploys → Trigger deploy*) para as variáveis valerem.
3. Abra `https://SEU-SITE/admin.html`, entre com a senha e cadastre os perfis.
4. Entregue ao dono do bot a pasta `bot-presence/` e a `PRESENCE_KEY` (ele segue o `bot-presence/LEIA-ME.md`).

## Domínio próprio
Netlify → Domain management → Add a domain. Para `www`: CNAME → `SEU-SITE.netlify.app`.
Para o domínio sem `www`: Netlify DNS (trocar os nameservers) ou ALIAS/ANAME. O HTTPS é automático.

## Como funciona
- `index.html` mostra todos os perfis lado a lado. `admin.html` é o painel (perfis, emblemas extras, estoque).
- `netlify/functions/api.mts` + `netlify/lib/api-core.mts`: a API (login, perfis, estoque, status).
- Dados em **Netlify Blobs** (global em produção). Códigos do estoque e senha **nunca** passam pelo bot.
- Se o bot ficar mais de 10 minutos sem enviar nada, o site deixa de mostrar status (em vez de mostrar dado velho).

## Ícones dos emblemas
Os emblemas extras (Nitro e níveis, Booster, missão) usam imagens da pasta `badges/`, hospedadas no seu próprio site
(ícones do projeto [Discord-badges](https://github.com/Fmasterpro27/Discord-badges), licença MIT em
`badges/LICENSE-icones.txt`). As artes dos emblemas são marcas do Discord. Os emblemas automáticos
(HypeSquad, Dev Ativo etc.) ainda vêm da CDN do Discord, por código em `badges.js`.

## Alternativa com servidor próprio (VPS)
A pasta `server/` tem a mesma API em Node + bot próprio, para quem tiver uma VPS. Veja `server/README.md`.
