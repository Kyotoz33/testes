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

## Diagnóstico rápido
Abra `https://SEU-SITE/api/info`. Em `config` aparece `true` ou `false` para cada variável **no deploy atual**
(nunca o valor). Se alguma estiver `false`, crie a variável no Netlify (escopo *Functions*, contexto *Production*) e faça
um novo deploy. O login e o bot também passam a dizer exatamente o que falta ("A variável X não está configurada…"
ou "Chave inválida: não confere…"). Espaços e quebras de linha sobrando nas pontas dos valores são ignorados.

## Como funciona
- `index.html` mostra todos os perfis lado a lado. `admin.html` é o painel (perfis, emblemas extras, estoque).
- `netlify/functions/api.mts` + `netlify/lib/api-core.mts`: a API (login, perfis, estoque, status).
- Dados em **Netlify Blobs** (global em produção). Códigos do estoque e senha **nunca** passam pelo bot.
- Se o bot ficar mais de 10 minutos sem enviar nada, o site deixa de mostrar status (em vez de mostrar dado velho).

## Cor e banner do cartão
O banner copia a cor do perfil do Discord, nesta ordem: **imagem de banner** do perfil, **cor de destaque** da conta,
**cor escolhida à mão** no painel (desmarque "Copiar a cor do perfil do Discord automaticamente") e, por fim, a
**cor média do avatar**. A imagem do banner e a cor de destaque vêm do bot (por isso reinicie o bot depois de atualizar
o `presence_push`). O **fundo do cartão** e os blocos ganham uma versão bem escura (ou clara, no tema claro) dessa
mesma cor, como no Discord; cor sem saturação deixa o cartão neutro. A cor do avatar é a "dominante viva" (não a média),
para fotos escuras não darem banner preto. A "Hora local" só aparece se você marcar "Mostrar a hora local no cartão" no perfil.

## Ícones dos emblemas
Os emblemas extras (Nitro e níveis, Booster, missão) usam imagens da pasta `badges/`, hospedadas no seu próprio site
(ícones do projeto [Discord-badges](https://github.com/Fmasterpro27/Discord-badges), licença MIT em
`badges/LICENSE-icones.txt`). As artes dos emblemas são marcas do Discord. Os emblemas automáticos
(HypeSquad, Dev Ativo etc.) ainda vêm da CDN do Discord, por código em `badges.js`.

## Alternativa com servidor próprio (VPS)
A pasta `server/` tem a mesma API em Node + bot próprio, para quem tiver uma VPS. Veja `server/README.md`.
