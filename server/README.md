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

## Estoque de códigos (aba "Estoque" do painel)
- Guardado em `STOCK_FILE` (padrão `./data/stock.json`, use disco persistente e faça backup).
- Só acessível com login; **nunca** aparece na API pública.
- "Copiar" coloca o código na área de transferência e o marca como **usado**. Ele continua guardado
  (dá para copiar de novo, "Desfazer" ou excluir).
- Em teste sem HTTPS o navegador pode bloquear a cópia direta; o painel usa um plano B automático.
  Na VPS, use HTTPS (Caddy/Nginx + certificado) para proteger a senha e os códigos em trânsito.

## Colocar tudo na VPS (sem comprar domínio)
O servidor entrega o site **e** a API no mesmo endereço (`apiUrl: "/"` no `config.js`, já é o padrão).
Não precisa de Netlify.

**Endereço grátis com HTTPS** (o HTTPS protege a senha e os códigos):
- **sslip.io**, sem cadastro: se o IP da VPS é `203.0.113.5`, o endereço é `203-0-113-5.sslip.io`.
  Funciona na hora, mas os certificados de todo mundo que usa o sslip.io dividem um limite do Let's Encrypt;
  se falhar, use o DuckDNS.
- **DuckDNS** (https://www.duckdns.org): crie `seunome.duckdns.org` apontando para o IP. Grátis e estável.
- Sem HTTPS (só para testar): `http://IP:3000`. A senha trafega sem criptografia.

**Passo a passo** (Debian/Ubuntu, Node 20 ou mais novo):
```bash
sudo apt install -y git caddy          # Node 20+: https://nodejs.org (ou NodeSource)
sudo useradd -r -m -s /usr/sbin/nologin perfil
# se o repositório for privado, use um token do GitHub ou envie a pasta com scp
sudo git clone -b claude/vibrant-dirac-hz7wlg https://github.com/Kyotoz33/testes /opt/perfil
cd /opt/perfil/server
sudo npm install --omit=dev
sudo cp .env.example .env && sudo nano .env      # ADMIN_PASSWORD, SESSION_SECRET, DISCORD_TOKEN, GUILD_ID
sudo chmod 600 .env
sudo mkdir -p data && sudo chown -R perfil:perfil data

sudo cp /opt/perfil/deploy/perfil.service /etc/systemd/system/
sudo systemctl enable --now perfil
sudo journalctl -u perfil -f                     # deve mostrar "Bot online"

# HTTPS automático: edite /etc/caddy/Caddyfile com o conteúdo de deploy/Caddyfile
# (troque SEU-ENDERECO-AQUI pelo endereço) e recarregue:
sudo systemctl reload caddy
sudo ufw allow 80,443/tcp                         # se usar firewall (não abra a 3000)
```
Acesse `https://SEU-ENDERECO/` (site) e `https://SEU-ENDERECO/admin.html` (painel).

**Atualizar depois:** `cd /opt/perfil && sudo git pull && sudo systemctl restart perfil`.
**Backup:** copie `/opt/perfil/server/data/` (perfis e estoque).

## Emblemas extras e pessoas fora do servidor
- **Emblemas extras:** no formulário do perfil, marque Nitro, Boost, etc. O Discord não informa esses
  emblemas para bots, então a lista é manual. O catálogo e os ícones ficam em `badges.js`
  (se um ícone não carregar, troque o hash dele; o site mostra o nome em texto enquanto isso).
- **Status de outras pessoas:** o Discord só informa status de quem está em um servidor em comum com o
  bot. O painel mostra, em cada perfil, se a pessoa está no servidor ✔ ou fora ✖, e em
  "Mostrar o status de outras pessoas" gera o **convite do servidor** para você mandar.
  Para gerar o convite, o bot precisa da permissão "Criar convite": use o botão
  "Link para autorizar o bot" (ele já pede só essa permissão) e autorize no seu servidor.
- Não usamos selfbot (viola os Termos do Discord e expõe o token da sua conta).
