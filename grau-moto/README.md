# Grau de Moto (prototipo Godot 4.3)

Jogo de empinar a moto. Segure o lado direito da tela para acelerar e o esquerdo para frear;
mantenha a moto no marcador verde pelo maior tempo possivel. Teclado para teste: seta cima/espaco e seta baixo.

## Abrir
Instale o Godot 4.3+ (godotengine.org), importe esta pasta (`project.godot`) e aperte F5.

## Ajustar a sensacao
No topo de `main.gd`: `BALANCE`, `TORQUE_*`, `UNSTABLE`, `DAMPING`, `SPEED_BASE`.

## Android / iOS
- Android: Projeto > Exportar > Android (precisa de Android SDK e JDK 17; ver docs do Godot).
- iOS: exporta um projeto Xcode; precisa de Mac e conta Apple Developer.
