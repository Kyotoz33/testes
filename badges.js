// Emblemas com ícone oficial: cdn.discordapp.com/badge-icons/<hash>.png
// Se um ícone não carregar, o site mostra o nome em texto. Para corrigir, troque o hash.

// Emblemas que o Discord informa sozinho [bit, nome, hash]
window.DISCORD_FLAGS = [
  [1 << 0, "Staff do Discord", "5e74e9b61934fc1f67c65515d1f7e60d"],
  [1 << 1, "Parceiro", "3f9748e53446a137a052f3454e2de41e"],
  [1 << 2, "HypeSquad Events", "bf01d1073931f921909045f3a39fd264"],
  [1 << 3, "Bug Hunter", "2717692c7dca7289b35297368a940dd0"],
  [1 << 6, "HypeSquad Bravery", "8a88d63823d8a71cd5e390baa45efa02"],
  [1 << 7, "HypeSquad Brilliance", "011940fd013da3f7fb926e4a1cd2e618"],
  [1 << 8, "HypeSquad Balance", "3aa41de486fa12454c3761e8e223442e"],
  [1 << 9, "Early Supporter", "7060786766c9c840eb3019e725d2b358"],
  [1 << 14, "Bug Hunter Nível 2", "848f79194d4be5ff5f81505cbd0ce1e6"],
  [1 << 17, "Dev de Bot Verificado", "6df5892e0f35b051f8b61eace34f4967"],
  [1 << 22, "Desenvolvedor Ativo", "6bdc42827a38498929a4920da12695d9"],
];

// Emblemas que a API não entrega: você marca no painel. chave: [nome, imagem]
// A maioria é hospedada aqui, na pasta badges/ (ícones MIT: ver badges/LICENSE-icones.txt),
// então não depende da CDN do Discord.
window.MANUAL_BADGES = {
  nitro: ["Discord Nitro", "badges/nitro.svg"],
  nitro_bronze: ["Nitro Bronze (1 mês)", "badges/nitro-bronze.png"],
  nitro_silver: ["Nitro Prata (3 meses)", "badges/nitro-silver.png"],
  nitro_gold: ["Nitro Ouro (6 meses)", "badges/nitro-gold.png"],
  nitro_platinum: ["Nitro Platina (12 meses)", "badges/nitro-platinum.png"],
  nitro_diamond: ["Nitro Diamante (24 meses)", "badges/nitro-diamond.png"],
  nitro_emerald: ["Nitro Esmeralda (36 meses)", "badges/nitro-emerald.png"],
  nitro_ruby: ["Nitro Rubi (60 meses)", "badges/nitro-ruby.png"],
  nitro_opal: ["Nitro Opala (72+ meses)", "badges/nitro-opal.png"],
  boost1: ["Booster desde 1 mês", "badges/boost-1.svg"],
  boost2: ["Booster desde 2 meses", "badges/boost-2.svg"],
  boost3: ["Booster desde 3 meses", "badges/boost-3.svg"],
  boost6: ["Booster desde 6 meses", "badges/boost-4.svg"],
  boost9: ["Booster desde 9 meses", "badges/boost-5.svg"],
  boost12: ["Booster desde 12 meses", "badges/boost-6.svg"],
  boost15: ["Booster desde 15 meses", "badges/boost-7.svg"],
  boost18: ["Booster desde 18 meses", "badges/boost-8.svg"],
  boost24: ["Booster desde 24 meses", "badges/boost-9.svg"],
  quest: ["Concluiu uma missão", "badges/quest.png"],
  legacy: ["Originalmente conhecido como", "https://cdn.discordapp.com/badge-icons/6de6d34650760ba5551a79732e98ed60.png"],
};
