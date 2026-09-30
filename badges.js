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

// Emblemas que a API não entrega: você marca no painel. chave: [nome, hash]
window.MANUAL_BADGES = {
  nitro: ["Discord Nitro", "2ba85e8026a8614b640c2837bcdfe21b"],
  boost1: ["Booster desde 1 mês", "51040c70d4f20a921ad6674ff86fc95c"],
  boost2: ["Booster desde 2 meses", "0e4080d1d333bc7ad29ef6528b6f2fb7"],
  boost3: ["Booster desde 3 meses", "72bed924410c304dbe3d00a6e593ff59"],
  boost6: ["Booster desde 6 meses", "df199d2050d3ed4ebf84d64ae83989f8"],
  boost9: ["Booster desde 9 meses", "996b3e870e8a22ce519b3a50e6bdd52f"],
  boost12: ["Booster desde 12 meses", "991c9f39ee33d7537d9f408c3e53141e"],
  boost15: ["Booster desde 15 meses", "cb3ae83c15e970e8f3d410bc62cb8b99"],
  boost18: ["Booster desde 18 meses", "7142225d31238f6387d9f09efaa02759"],
  boost24: ["Booster desde 24 meses", "ec92202290b48d0879b7413d2dde3bab"],
  legacy: ["Originalmente conhecido como", "6de6d34650760ba5551a79732e98ed60"],
  quest: ["Concluiu uma missão", "7d9ae358c8c5e118768335dbe68b4fb8"],
};
