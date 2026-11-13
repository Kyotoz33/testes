package com.kyoto.keybindhelper;

import com.mojang.blaze3d.platform.InputConstants;
import net.minecraft.client.Minecraft;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.event.lifecycle.FMLClientSetupEvent;
import net.neoforged.neoforge.client.event.InputEvent;
import net.neoforged.neoforge.common.NeoForge;

/** Mod cliente: abre a tela de binds com uma tecla fixa (padrao: Shift Direito). */
@Mod(value = KeybindHelper.MOD_ID, dist = Dist.CLIENT)
public class KeybindHelper {
    public static final String MOD_ID = "keybindhelper";

    public KeybindHelper(IEventBus modBus) {
        modBus.addListener(this::onClientSetup);
        NeoForge.EVENT_BUS.register(this);
    }

    private void onClientSetup(FMLClientSetupEvent event) {
        // Reaplica as teclas salvas (o launcher pode sobrescrever o options.txt a cada inicio).
        event.enqueueWork(BindStore::applyAll);
    }

    @SubscribeEvent
    public void onKey(InputEvent.Key event) {
        if (event.getAction() != 1) return; // GLFW_PRESS
        Minecraft mc = Minecraft.getInstance();
        if (mc.screen != null) return;
        InputConstants.Key open = BindStore.openKey();
        if (event.getKey() == open.getValue() && open.getType() == InputConstants.Type.KEYSYM) {
            mc.setScreen(new BindScreen(null));
        }
    }
}
