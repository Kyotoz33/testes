package com.kyoto.keybindhelper;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.mojang.blaze3d.platform.InputConstants;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.neoforged.fml.loading.FMLPaths;
import net.neoforged.neoforge.client.settings.KeyModifier;

import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Guarda as teclas em config/keybindhelper.json e reaplica ao iniciar.
 * Formato: { "openKey": "key.keyboard.right.shift", "binds": { "key.nome": "MODIFIER|key.keyboard.k" } }
 */
public final class BindStore {
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    private static final String DEFAULT_OPEN = "key.keyboard.right.shift";

    private static String openKey = DEFAULT_OPEN;
    private static final Map<String, String> binds = new LinkedHashMap<>();
    private static boolean loaded = false;

    private BindStore() {}

    private static Path file() {
        return FMLPaths.CONFIGDIR.get().resolve("keybindhelper.json");
    }

    private static synchronized void load() {
        if (loaded) return;
        loaded = true;
        Path f = file();
        if (!Files.exists(f)) return;
        try (Reader r = Files.newBufferedReader(f)) {
            JsonObject o = GSON.fromJson(r, JsonObject.class);
            if (o == null) return;
            if (o.has("openKey")) openKey = o.get("openKey").getAsString();
            if (o.has("binds")) {
                for (var e : o.getAsJsonObject("binds").entrySet()) {
                    binds.put(e.getKey(), e.getValue().getAsString());
                }
            }
        } catch (Exception ex) {
            System.err.println("[keybindhelper] Falha ao ler config: " + ex);
        }
    }

    private static synchronized void save() {
        JsonObject o = new JsonObject();
        o.addProperty("openKey", openKey);
        JsonObject b = new JsonObject();
        binds.forEach(b::addProperty);
        o.add("binds", b);
        try (Writer w = Files.newBufferedWriter(file())) {
            GSON.toJson(o, w);
        } catch (IOException ex) {
            System.err.println("[keybindhelper] Falha ao salvar config: " + ex);
        }
    }

    public static InputConstants.Key openKey() {
        load();
        try {
            return InputConstants.getKey(openKey);
        } catch (Exception e) {
            return InputConstants.getKey(DEFAULT_OPEN);
        }
    }

    /** Guarda e aplica a tecla de um mapeamento. */
    public static void set(KeyMapping m, KeyModifier mod, InputConstants.Key key) {
        load();
        m.setKeyModifierAndCode(mod, key);
        binds.put(m.getName(), mod.name() + "|" + key.getName());
        finish();
    }

    /** Volta ao padrao do mod e esquece o override. */
    public static void reset(KeyMapping m) {
        load();
        m.setToDefault();
        binds.remove(m.getName());
        finish();
    }

    private static void finish() {
        KeyMapping.resetMapping();
        Minecraft.getInstance().options.save();
        save();
    }

    /** Reaplica tudo que foi salvo (chamado no inicio do jogo). */
    public static void applyAll() {
        load();
        if (binds.isEmpty()) return;
        for (KeyMapping m : Minecraft.getInstance().options.keyMappings) {
            String v = binds.get(m.getName());
            if (v == null) continue;
            try {
                String[] p = v.split("\\|", 2);
                KeyModifier mod = KeyModifier.valueOf(p[0]);
                m.setKeyModifierAndCode(mod, InputConstants.getKey(p[1]));
            } catch (Exception ex) {
                System.err.println("[keybindhelper] Bind invalido para " + m.getName() + ": " + v);
            }
        }
        KeyMapping.resetMapping();
    }
}
