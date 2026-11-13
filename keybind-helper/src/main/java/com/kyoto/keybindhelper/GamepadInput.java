package com.kyoto.keybindhelper;

import org.lwjgl.glfw.GLFW;
import org.lwjgl.glfw.GLFWGamepadState;
import org.lwjgl.system.MemoryStack;

import java.util.ArrayList;
import java.util.List;

/** Le o controle (Xbox e similares) via API de gamepad do GLFW e devolve uma mascara de botoes. */
public final class GamepadInput {
    /** Bits 0-14 = botoes GLFW gamepad; 15 = LT; 16 = RT. */
    public static final String[] NAMES = {
            "A", "B", "X", "Y", "LB", "RB", "View", "Menu", "Xbox", "L3", "R3",
            "D-Pad Cima", "D-Pad Direita", "D-Pad Baixo", "D-Pad Esquerda", "LT", "RT"
    };
    public static final int OPEN_DEFAULT = (1 << 6) | (1 << 7); // View + Menu

    private GamepadInput() {}

    public static int poll() {
        int mask = 0;
        try (MemoryStack stack = MemoryStack.stackPush()) {
            GLFWGamepadState s = GLFWGamepadState.malloc(stack);
            for (int jid = GLFW.GLFW_JOYSTICK_1; jid <= GLFW.GLFW_JOYSTICK_LAST; jid++) {
                if (!GLFW.glfwJoystickPresent(jid) || !GLFW.glfwJoystickIsGamepad(jid)) continue;
                if (!GLFW.glfwGetGamepadState(jid, s)) continue;
                for (int b = 0; b <= GLFW.GLFW_GAMEPAD_BUTTON_LAST && b < 15; b++) {
                    if (s.buttons(b) == GLFW.GLFW_PRESS) mask |= 1 << b;
                }
                if (s.axes(GLFW.GLFW_GAMEPAD_AXIS_LEFT_TRIGGER) > 0.5f) mask |= 1 << 15;
                if (s.axes(GLFW.GLFW_GAMEPAD_AXIS_RIGHT_TRIGGER) > 0.5f) mask |= 1 << 16;
            }
        } catch (Throwable t) {
            return 0;
        }
        return mask;
    }

    public static String describe(int mask) {
        if (mask == 0) return "-";
        List<String> parts = new ArrayList<>();
        for (int i = 0; i < NAMES.length; i++) {
            if ((mask & (1 << i)) != 0) parts.add(NAMES[i]);
        }
        return String.join(" + ", parts);
    }
}
