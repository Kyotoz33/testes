package com.kyoto.keybindhelper;

import com.mojang.blaze3d.platform.InputConstants;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.event.lifecycle.FMLClientSetupEvent;
import net.neoforged.fml.util.ObfuscationReflectionHelper;
import net.neoforged.neoforge.client.event.ClientTickEvent;
import net.neoforged.neoforge.client.event.InputEvent;
import net.neoforged.neoforge.common.NeoForge;

import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Mod cliente: abre a tela de binds (Shift Direito no teclado ou View+Menu no controle)
 * e traduz botoes do controle em acoes de qualquer mod.
 */
@Mod(value = KeybindHelper.MOD_ID, dist = Dist.CLIENT)
public class KeybindHelper {
    public static final String MOD_ID = "keybindhelper";

    private final Set<KeyMapping> active = new HashSet<>();
    private Map<String, KeyMapping> byName;
    private int prevMask = 0;
    private static Field clickCount;

    public KeybindHelper(IEventBus modBus) {
        modBus.addListener(this::onClientSetup);
        NeoForge.EVENT_BUS.register(this);
        try {
            clickCount = ObfuscationReflectionHelper.findField(KeyMapping.class, "clickCount");
        } catch (Throwable t) {
            System.err.println("[keybindhelper] clickCount indisponivel: " + t);
        }
    }

    private void onClientSetup(FMLClientSetupEvent event) {
        event.enqueueWork(BindStore::applyAll);
    }

    @SubscribeEvent
    public void onKey(InputEvent.Key event) {
        if (event.getAction() != 1) return; // GLFW_PRESS
        Minecraft mc = Minecraft.getInstance();
        if (mc.screen != null) return;
        InputConstants.Key open = BindStore.openKey();
        if (open.getType() == InputConstants.Type.KEYSYM && event.getKey() == open.getValue()) {
            mc.setScreen(new BindScreen(null));
        }
    }

    @SubscribeEvent
    public void onTick(ClientTickEvent.Post event) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.screen != null) {
            releaseAll();
            prevMask = 0;
            return;
        }
        int mask = GamepadInput.poll();

        int openPad = BindStore.openPad();
        if (openPad != 0 && (mask & openPad) == openPad && (prevMask & openPad) != openPad) {
            releaseAll();
            prevMask = mask;
            mc.setScreen(new BindScreen(null));
            return;
        }
        prevMask = mask;

        if (byName == null) {
            byName = new HashMap<>();
            for (KeyMapping m : mc.options.keyMappings) byName.put(m.getName(), m);
        }

        Map<String, Integer> binds = BindStore.padBinds();
        Set<KeyMapping> want = new HashSet<>();
        for (var e : binds.entrySet()) {
            int mb = e.getValue();
            if (mb == 0 || (mask & mb) != mb) continue;
            // combinacao maior (ex.: LB+A) tem prioridade sobre a menor (A)
            boolean shadowed = false;
            for (int other : binds.values()) {
                if (other != mb && (other & mb) == mb && (mask & other) == other) { shadowed = true; break; }
            }
            if (shadowed) continue;
            KeyMapping m = byName.get(e.getKey());
            if (m != null) want.add(m);
        }

        for (KeyMapping m : want) {
            if (active.add(m)) {
                m.setDown(true);
                click(m);
            }
        }
        active.removeIf(m -> {
            if (want.contains(m)) return false;
            m.setDown(false);
            return true;
        });
    }

    private void releaseAll() {
        for (KeyMapping m : active) m.setDown(false);
        active.clear();
    }

    private static void click(KeyMapping m) {
        if (clickCount == null) return;
        try {
            clickCount.setInt(m, clickCount.getInt(m) + 1);
        } catch (Throwable ignored) {
        }
    }
}
