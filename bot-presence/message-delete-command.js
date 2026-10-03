// Slash command /deletar para apagar todas as mensagens de um canal.
// Para bots em discord.js v14, Node 18+.
//
// Uso (no arquivo principal do bot, depois de criar o `client`):
//   const setupMessageDeleteCommand = require("./message-delete-command.js");
//   setupMessageDeleteCommand(client, { url: "https://seu-site.com", key: process.env.PRESENCE_KEY });
//
// Requisitos do bot:
// - Ativar "Presence Intent" no portal do Discord
// - Declarar GatewayIntentBits.Guilds, GuildMembers, MessageContent, DirectMessages no código
// - Dar permissão MANAGE_MESSAGES e READ_MESSAGE_HISTORY ao bot

module.exports = function setupMessageDeleteCommand(client, { url, key }) {
  if (!url || !key) throw new Error("message-delete-command: informe url e key");
  const base = url.replace(/\/$/, "");
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + key };

  // Registra o slash command
  client.once("ready", async () => {
    try {
      const guild = client.guilds.cache.first();
      if (!guild) {
        console.log("[message-delete] Nenhum servidor encontrado para registrar comando");
        return;
      }

      const command = {
        name: "deletar",
        description: "Deleta todas as mensagens do canal (se autorizado no painel admin)",
      };

      const existing = await guild.commands.fetch();
      const existingCmd = existing.find((c) => c.name === "deletar");

      if (existingCmd) {
        await existingCmd.edit(command);
        console.log("[message-delete] Comando /deletar atualizado");
      } else {
        await guild.commands.create(command);
        console.log("[message-delete] Comando /deletar registrado");
      }
    } catch (e) {
      console.error("[message-delete] Erro ao registrar comando:", e.message);
    }
  });

  // Escuta o slash command
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand() || interaction.commandName !== "deletar") return;

    try {
      await interaction.deferReply({ ephemeral: true });

      // Checa permissões
      if (!interaction.channel) {
        return await interaction.editReply("Erro: não consegui acessar o canal.");
      }

      const me = interaction.guild?.members.me;
      if (!me?.permissions.has("ManageMessages")) {
        return await interaction.editReply("Erro: o bot não tem permissão MANAGE_MESSAGES no servidor.");
      }

      if (!me.permissionsIn(interaction.channel).has("ManageMessages")) {
        return await interaction.editReply("Erro: o bot não tem permissão MANAGE_MESSAGES neste canal.");
      }

      // Verifica se a funcionalidade está habilitada
      const checkUrl = `${base}/api/messages-delete-enabled`;
      const checkRes = await fetch(checkUrl, {
        method: "GET",
        headers,
      });

      if (!checkRes.ok) {
        console.error("[message-delete] Erro ao verificar estado:", checkRes.status);
        return await interaction.editReply("Erro: não consegui conectar ao servidor.");
      }

      const checkData = await checkRes.json();
      if (!checkData.success || !checkData.enabled) {
        return await interaction.editReply("A funcionalidade de deletar mensagens está desativada no painel admin.");
      }

      // Deleta as mensagens
      let deleted = 0;
      try {
        // fetchMessages pega as últimas 100 (limite do bulk delete)
        while (true) {
          const messages = await interaction.channel.messages.fetch({ limit: 100 });
          if (messages.size === 0) break;
          await interaction.channel.bulkDelete(messages);
          deleted += messages.size;
        }
      } catch (e) {
        console.error("[message-delete] Erro ao deletar:", e.message);
        return await interaction.editReply(`Erro ao deletar. ${deleted} mensagens foram apagadas antes do erro.`);
      }

      await interaction.editReply(`✅ Deletadas ${deleted} mensagens do canal.`);
    } catch (e) {
      console.error("[message-delete] Erro:", e.message);
      try {
        await interaction.editReply("Erro ao processar comando.");
      } catch {}
    }
  });
};
