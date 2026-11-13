# Keybind Helper (NeoForge 1.21.1)

Mod cliente que abre uma tela propria para configurar as teclas de **todos** os mods,
util quando o launcher bloqueia a tela de Controles.

- Abrir a tela: **Shift Direito** (dentro do jogo, sem outra tela aberta).
  Para trocar, edite `openKey` em `config/keybindhelper.json` (ex.: `key.keyboard.k`).
- Clique na tecla ao lado da acao, aperte a nova tecla/botao (aceita Ctrl/Shift/Alt + tecla).
  ESC cancela, Delete/Backspace remove a tecla. Teclas em conflito ficam em vermelho.
- As binds sao salvas em `config/keybindhelper.json` e reaplicadas ao iniciar o jogo,
  mesmo se o launcher sobrescrever o `options.txt`.

## Compilar
`gradle build` (Java 21) -> `build/libs/keybindhelper-1.0.0.jar`.
O GitHub Actions (`Build Keybind Helper`) tambem gera o jar como artefato.
