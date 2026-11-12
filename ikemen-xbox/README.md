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

## Montando um roster leve (KOF / Street Fighter)
Os personagens não vêm no repositório (direitos autorais SNK/Capcom). Baixe os que quiser
de fontes que você confia e solte em `chars/<nome>/`. Depois:

    python3 tools/gen_select.py        # regenera data/select.def e avisa de chars pesados
    cp save/config.light.ini save/config.ini

Dicas para ficar leve no console:
- Prefira chars de **sprites 1x, SFF v1**, até ~5-15 MB cada. Evite chars "HD", com
  muitos helpers/explods ou efeitos de tela cheia.
- Um roster de 20-30 lutadores já é bom; menos chars = carregamento mais rápido.
- Stages pequenos, sem vídeo/animação pesada; remova músicas grandes (.wav) ou converta para .ogg.
- `config.light.ini` desliga o modo 3D (`EnableModel=0`), reduz canais de áudio e mantém 720p/60fps.
- Teste cada char sozinho no Training antes de adicionar (chars mal feitos travam o jogo).
