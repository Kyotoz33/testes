package com.kyoto.keybindhelper;

import com.mojang.blaze3d.platform.InputConstants;
import net.minecraft.ChatFormatting;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.CommonComponents;
import net.minecraft.network.chat.Component;
import net.neoforged.neoforge.client.settings.KeyModifier;
import org.lwjgl.glfw.GLFW;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Tela propria para ver e alterar as teclas de todos os mods. */
public class BindScreen extends Screen {
    private static final int ROW_H = 22;
    private static final int KEY_W = 90;
    private static final int PAD_W = 110;
    private static final int RESET_W = 50;

    private final Screen parent;
    private EditBox search;
    private final List<Row> rows = new ArrayList<>();
    private double scroll = 0;
    private KeyMapping waiting = null;
    private KeyMapping waitingPad = null;
    private int lastPad = GamepadInput.poll();
    private int chord = 0;

    /** Linha da lista: ou um titulo de categoria, ou um mapeamento. */
    private record Row(String header, KeyMapping mapping) {}

    public BindScreen(Screen parent) {
        super(Component.literal("Keybind Helper - Teclas dos Mods"));
        this.parent = parent;
    }

    @Override
    protected void init() {
        search = new EditBox(font, width / 2 - 100, 28, 200, 18, Component.literal("Buscar"));
        search.setHint(Component.literal("Buscar tecla ou mod..."));
        search.setResponder(s -> { rebuild(); scroll = 0; });
        addRenderableWidget(search);
        addRenderableWidget(Button.builder(CommonComponents.GUI_DONE, b -> onClose())
                .bounds(width / 2 - 100, height - 28, 200, 20).build());
        rebuild();
    }

    private void rebuild() {
        rows.clear();
        String q = search == null ? "" : search.getValue().toLowerCase(Locale.ROOT).trim();
        KeyMapping[] all = Minecraft.getInstance().options.keyMappings.clone();
        java.util.Arrays.sort(all, (a, b) -> {
            int c = a.getCategory().compareTo(b.getCategory());
            return c != 0 ? c : a.getName().compareTo(b.getName());
        });
        String last = null;
        for (KeyMapping m : all) {
            String name = Component.translatable(m.getName()).getString();
            String cat = Component.translatable(m.getCategory()).getString();
            if (!q.isEmpty() && !name.toLowerCase(Locale.ROOT).contains(q)
                    && !cat.toLowerCase(Locale.ROOT).contains(q)
                    && !m.getName().toLowerCase(Locale.ROOT).contains(q)) continue;
            if (!m.getCategory().equals(last)) {
                rows.add(new Row(cat, null));
                last = m.getCategory();
            }
            rows.add(new Row(null, m));
        }
    }

    private int listTop() { return 52; }
    private int listBottom() { return height - 36; }
    private int listLeft() { return width / 2 - 200; }
    private int listRight() { return width / 2 + 200; }

    private double maxScroll() {
        return Math.max(0, rows.size() * ROW_H - (listBottom() - listTop()));
    }

    private boolean conflicts(KeyMapping m) {
        if (m.isUnbound()) return false;
        for (KeyMapping o : Minecraft.getInstance().options.keyMappings) {
            if (o != m && o.getKey().equals(m.getKey()) && o.getKeyModifier() == m.getKeyModifier()) return true;
        }
        return false;
    }

    @Override
    public void render(GuiGraphics g, int mx, int my, float pt) {
        super.render(g, mx, my, pt);
        g.drawCenteredString(font, title, width / 2, 10, 0xFFFFFF);

        int top = listTop(), bottom = listBottom(), left = listLeft(), right = listRight();
        g.fill(left - 4, top - 2, right + 4, bottom + 2, 0x90000000);
        g.enableScissor(left - 4, top, right + 4, bottom);
        int y = top - (int) scroll;
        for (Row r : rows) {
            if (y + ROW_H >= top && y <= bottom) {
                if (r.header != null) {
                    g.drawString(font, Component.literal(r.header).withStyle(ChatFormatting.YELLOW, ChatFormatting.BOLD),
                            left, y + 7, 0xFFFFFF);
                } else {
                    renderMapping(g, r.mapping, left, right, y, mx, my);
                }
            }
            y += ROW_H;
        }
        g.disableScissor();

        pollPad();
        if (waitingPad != null) {
            g.drawCenteredString(font, Component.literal("Aperte o botao ou combinacao (ate 3 botoes) e solte. ESC cancela, Delete limpa")
                    .withStyle(ChatFormatting.GREEN), width / 2, height - 44, 0xFFFFFF);
        } else if (waiting != null) {
            g.drawCenteredString(font, Component.literal("Pressione uma tecla ou botao do mouse (ESC cancela)")
                    .withStyle(ChatFormatting.AQUA), width / 2, height - 44, 0xFFFFFF);
        }
    }

    private void renderMapping(GuiGraphics g, KeyMapping m, int left, int right, int y, int mx, int my) {
        int padX = right - RESET_W - 4 - PAD_W;
        int keyX = padX - 4 - KEY_W;
        int resetX = right - RESET_W;
        boolean inList = my >= listTop() && my <= listBottom();

        g.drawString(font, Component.translatable(m.getName()), left, y + 7, 0xFFFFFF);

        boolean isWaiting = waiting == m;
        boolean hoverKey = inList && mx >= keyX && mx < keyX + KEY_W && my >= y + 1 && my < y + 21;
        g.fill(keyX, y + 1, keyX + KEY_W, y + 21, hoverKey ? 0xFF555555 : 0xFF333333);
        g.renderOutline(keyX, y + 1, KEY_W, 20, isWaiting ? 0xFFFFFF55 : 0xFF888888);

        Component label = isWaiting
                ? Component.literal("> ").append(m.getTranslatedKeyMessage()).append(" <").withStyle(ChatFormatting.YELLOW)
                : m.getTranslatedKeyMessage();
        if (!isWaiting && conflicts(m)) label = label.copy().withStyle(ChatFormatting.RED);
        g.drawCenteredString(font, label, keyX + KEY_W / 2, y + 7, 0xFFFFFF);

        boolean padWait = waitingPad == m;
        boolean hoverPad = inList && mx >= padX && mx < padX + PAD_W && my >= y + 1 && my < y + 21;
        g.fill(padX, y + 1, padX + PAD_W, y + 21, hoverPad ? 0xFF555555 : 0xFF333333);
        g.renderOutline(padX, y + 1, PAD_W, 20, padWait ? 0xFF55FF55 : 0xFF888888);
        int pm = BindStore.padMask(m);
        String ptxt = padWait ? "> " + (chord == 0 ? "..." : GamepadInput.describe(chord)) + " <" : GamepadInput.describe(pm);
        g.drawCenteredString(font, Component.literal(ptxt).withStyle(padWait ? ChatFormatting.GREEN : ChatFormatting.WHITE),
                padX + PAD_W / 2, y + 7, 0xFFFFFF);

        boolean canReset = !m.isDefault() || BindStore.padMask(m) != 0;
        boolean hoverReset = inList && canReset && mx >= resetX && mx < resetX + RESET_W && my >= y + 1 && my < y + 21;
        g.fill(resetX, y + 1, resetX + RESET_W, y + 21, hoverReset ? 0xFF555555 : 0xFF333333);
        g.renderOutline(resetX, y + 1, RESET_W, 20, 0xFF888888);
        g.drawCenteredString(font, Component.literal("Reset"), resetX + RESET_W / 2, y + 7,
                canReset ? 0xFFFFFF : 0x777777);
    }

    @Override
    public boolean mouseClicked(double mx, double my, int button) {
        if (waitingPad != null) return true;
        if (waiting != null) {
            BindStore.set(waiting, KeyModifier.getActiveModifier(),
                    InputConstants.Type.MOUSE.getOrCreate(button));
            waiting = null;
            return true;
        }
        if (super.mouseClicked(mx, my, button)) return true;
        if (my < listTop() || my > listBottom()) return false;

        int idx = (int) ((my - listTop() + scroll) / ROW_H);
        if (idx < 0 || idx >= rows.size()) return false;
        KeyMapping m = rows.get(idx).mapping;
        if (m == null) return false;

        int rowY = listTop() + idx * ROW_H - (int) scroll;
        int right = listRight();
        int padX = right - RESET_W - 4 - PAD_W;
        int keyX = padX - 4 - KEY_W;
        int resetX = right - RESET_W;
        if (my < rowY + 1 || my >= rowY + 21) return false;
        if (mx >= keyX && mx < keyX + KEY_W) {
            waiting = m;
            return true;
        }
        if (mx >= padX && mx < padX + PAD_W) {
            waitingPad = m;
            chord = 0;
            lastPad = GamepadInput.poll();
            return true;
        }
        if (mx >= resetX && mx < resetX + RESET_W && (!m.isDefault() || BindStore.padMask(m) != 0)) {
            BindStore.reset(m);
            return true;
        }
        return false;
    }

    @Override
    public boolean keyPressed(int key, int scan, int mods) {
        if (waitingPad != null) {
            if (key == GLFW.GLFW_KEY_DELETE || key == GLFW.GLFW_KEY_BACKSPACE) BindStore.setPad(waitingPad, 0);
            if (key == GLFW.GLFW_KEY_ESCAPE || key == GLFW.GLFW_KEY_DELETE || key == GLFW.GLFW_KEY_BACKSPACE) {
                waitingPad = null;
            }
            return true;
        }
        if (waiting != null) {
            if (key == GLFW.GLFW_KEY_ESCAPE) {
                waiting = null;
            } else if (key == GLFW.GLFW_KEY_DELETE || key == GLFW.GLFW_KEY_BACKSPACE) {
                BindStore.set(waiting, KeyModifier.NONE, InputConstants.UNKNOWN);
                waiting = null;
            } else if (!isModifierKey(key)) {
                BindStore.set(waiting, KeyModifier.getActiveModifier(), InputConstants.getKey(key, scan));
                waiting = null;
            }
            return true;
        }
        return super.keyPressed(key, scan, mods);
    }

    /** Captura uma combinacao de ate 3 botoes: grava quando todos forem soltos. */
    private void pollPad() {
        int cur = GamepadInput.poll();
        if (waitingPad != null) {
            int newly = cur & ~lastPad;
            while (newly != 0 && Integer.bitCount(chord) < 3) {
                int bit = Integer.lowestOneBit(newly);
                chord |= bit;
                newly &= ~bit;
            }
            if (cur == 0 && chord != 0) {
                BindStore.setPad(waitingPad, chord);
                waitingPad = null;
                chord = 0;
            }
        }
        lastPad = cur;
    }

    private static boolean isModifierKey(int key) {
        return key == GLFW.GLFW_KEY_LEFT_SHIFT || key == GLFW.GLFW_KEY_RIGHT_SHIFT
                || key == GLFW.GLFW_KEY_LEFT_CONTROL || key == GLFW.GLFW_KEY_RIGHT_CONTROL
                || key == GLFW.GLFW_KEY_LEFT_ALT || key == GLFW.GLFW_KEY_RIGHT_ALT;
    }

    @Override
    public boolean mouseScrolled(double mx, double my, double sx, double sy) {
        scroll = Math.max(0, Math.min(maxScroll(), scroll - sy * ROW_H));
        return true;
    }

    @Override
    public void onClose() {
        minecraft.setScreen(parent);
    }
}
