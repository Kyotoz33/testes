# Conteúdo Ikemen GO para Xbox Dev Mode

Pacote de dados (sem o executável) para usar com o seu port UWP do Ikemen GO.

## Estrutura
- `data/`     scripts padrão (.zss, common.*) + `select.def`
- `external/` scripts Lua, shaders e ícones
- `font/`     fontes
- `chars/`    seus personagens (`chars/<nome>/<nome>.def`)
- `stages/`   seus stages (`.def` + `.sff`)
- `sound/`    músicas (.mp3/.ogg)
- `save/`     config.ini, saves (o engine gera; há um exemplo)

## No Xbox
1. Copie esta pasta para junto do app (ou para o LocalState do app via Device Portal > File explorer).
2. O motif e o config padrão estão embutidos no engine; só crie `data/system.def` se quiser um motif próprio.
3. Gamepad: no `save/config.ini` ajuste `[Joystick_P1]`/`[Joystick_P2]` ou use Options > Input no jogo.
4. Resolução recomendada: 1280x720 ou 1920x1080 a 60 FPS.

## Conteúdo
Personagens e stages de terceiros têm licenças próprias; use só os que você pode distribuir.
O Ikemen GO é MIT (veja `LICENCE-IkemenGO.txt`).
