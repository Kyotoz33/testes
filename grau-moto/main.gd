extends Node2D
## Grau de Moto - prototipo.
## Segure o lado DIREITO da tela para acelerar (levanta a roda) e o ESQUERDO para frear.
## Mantenha a moto perto do ponto de equilibrio (marcador verde) o maximo de tempo possivel.
## Teclado para testes: seta cima/espaco = acelerar, seta baixo = frear.

enum State { WAIT, WHEELIE, CRASH }

const GROUND_Y := 820.0
const WHEEL_R := 38.0
const WHEELBASE := 170.0
const PIVOT_X := 560.0

const BALANCE := 0.85          # angulo (rad) de equilibrio, ~49 graus
const FLIP := 1.45             # passou disso, a moto capota
const TORQUE_THROTTLE := 9.0
const TORQUE_BRAKE := 8.0
const UNSTABLE := 3.2          # gravidade em torno do ponto de equilibrio
const DAMPING := 0.9
const SPEED_BASE := 380.0

var state := State.WAIT
var angle := 0.0               # 0 = rodas no chao, positivo = roda da frente levantada
var omega := 0.0
var distance := 0.0
var score := 0.0
var best := 0.0
var scroll := 0.0
var crash_reason := ""
var crash_time := 0.0

func _ready() -> void:
	best = _load_best()

func _input_throttle() -> bool:
	if Input.is_key_pressed(KEY_UP) or Input.is_key_pressed(KEY_SPACE):
		return true
	return Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT) and get_global_mouse_position().x >= get_viewport_rect().size.x * 0.5

func _input_brake() -> bool:
	if Input.is_key_pressed(KEY_DOWN):
		return true
	return Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT) and get_global_mouse_position().x < get_viewport_rect().size.x * 0.5

func _unhandled_input(event: InputEvent) -> void:
	if state == State.CRASH and crash_time > 0.6:
		var tap: bool = (event is InputEventMouseButton and event.pressed) or (event is InputEventKey and event.pressed)
		if tap:
			_restart()

func _restart() -> void:
	state = State.WAIT
	angle = 0.0
	omega = 0.0
	distance = 0.0
	score = 0.0
	crash_reason = ""
	crash_time = 0.0

func _physics_process(delta: float) -> void:
	if state == State.CRASH:
		crash_time += delta
		queue_redraw()
		return

	var up := _input_throttle()
	var down := _input_brake()

	var alpha := 0.0
	if up:
		alpha += TORQUE_THROTTLE
	if down:
		alpha -= TORQUE_BRAKE
	alpha += UNSTABLE * sin(angle - BALANCE)
	alpha -= DAMPING * omega

	omega += alpha * delta
	angle += omega * delta

	if state == State.WAIT:
		if angle < 0.0:
			angle = 0.0
			omega = maxf(omega, 0.0)
		elif angle > 0.35:
			state = State.WHEELIE
	elif state == State.WHEELIE:
		if angle <= 0.0:
			angle = 0.0
			_crash("A roda tocou o chao")
		elif angle >= FLIP:
			_crash("Capotou!")

	var speed := SPEED_BASE + (150.0 if up else 0.0)
	distance += speed * delta / 100.0
	scroll = fmod(scroll + speed * delta, 200.0)

	if state == State.WHEELIE:
		# Quanto mais perto do equilibrio, mais pontos por segundo.
		var closeness := clampf(1.0 - absf(angle - BALANCE) / 0.6, 0.0, 1.0)
		score += delta * (10.0 + 40.0 * closeness)

	queue_redraw()

func _crash(reason: String) -> void:
	state = State.CRASH
	crash_reason = reason
	crash_time = 0.0
	if score > best:
		best = score
		_save_best()

func _load_best() -> float:
	if FileAccess.file_exists("user://best.save"):
		var f := FileAccess.open("user://best.save", FileAccess.READ)
		if f:
			return f.get_float()
	return 0.0

func _save_best() -> void:
	var f := FileAccess.open("user://best.save", FileAccess.WRITE)
	if f:
		f.store_float(best)

func _draw() -> void:
	var size := get_viewport_rect().size
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.45, 0.72, 0.95))
	draw_rect(Rect2(0, GROUND_Y, size.x, size.y - GROUND_Y), Color(0.25, 0.25, 0.28))
	draw_line(Vector2(0, GROUND_Y), Vector2(size.x, GROUND_Y), Color(0.1, 0.1, 0.12), 6.0)
	var x := -scroll
	while x < size.x:
		draw_rect(Rect2(x, GROUND_Y + 70.0, 100.0, 10.0), Color(0.9, 0.9, 0.9))
		x += 200.0

	_draw_bike()
	_draw_hud(size)

func _draw_bike() -> void:
	var pivot := Vector2(PIVOT_X, GROUND_Y - WHEEL_R)
	var a := -angle
	if state == State.CRASH and crash_reason == "Capotou!":
		a = -angle - crash_time * 3.0
	draw_set_transform(pivot, a, Vector2.ONE)

	var tire := Color(0.08, 0.08, 0.08)
	var rim := Color(0.8, 0.8, 0.8)
	var front := Vector2(WHEELBASE, 0)
	for w in [Vector2.ZERO, front]:
		draw_circle(w, WHEEL_R, tire)
		draw_circle(w, WHEEL_R * 0.55, rim)
	var frame := Color(0.85, 0.1, 0.1)
	draw_line(Vector2.ZERO, Vector2(70, -50), frame, 10.0)
	draw_line(Vector2(70, -50), Vector2(130, -55), frame, 12.0)
	draw_line(Vector2(130, -55), front, frame, 8.0)
	draw_line(Vector2(70, -50), Vector2(95, 0), frame, 8.0)
	# piloto
	var skin := Color(0.95, 0.8, 0.65)
	var shirt := Color(0.15, 0.15, 0.2)
	draw_line(Vector2(60, -60), Vector2(75, -120), shirt, 14.0)
	draw_line(Vector2(75, -120), Vector2(125, -95), shirt, 9.0)
	draw_circle(Vector2(82, -145), 18.0, skin)
	draw_arc(Vector2(82, -145), 19.0, PI, TAU, 16, Color(0.9, 0.7, 0.0), 6.0)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func _draw_hud(size: Vector2) -> void:
	var font := ThemeDB.fallback_font
	draw_string(font, Vector2(40, 70), "Pontos: %d" % int(score), HORIZONTAL_ALIGNMENT_LEFT, -1, 48, Color.WHITE)
	draw_string(font, Vector2(40, 125), "Recorde: %d" % int(best), HORIZONTAL_ALIGNMENT_LEFT, -1, 32, Color(1, 1, 0.7))
	draw_string(font, Vector2(size.x - 420, 70), "%.2f km" % (distance / 10.0), HORIZONTAL_ALIGNMENT_LEFT, -1, 40, Color.WHITE)

	# Medidor de equilibrio (barra lateral)
	var bx := size.x - 90.0
	var top := 180.0
	var h := 500.0
	draw_rect(Rect2(bx, top, 30, h), Color(0, 0, 0, 0.35))
	draw_rect(Rect2(bx, top + h * (1.0 - (BALANCE + 0.15) / FLIP), 30, h * 0.30 / FLIP), Color(0.2, 0.9, 0.3, 0.55))
	var cy := top + h * (1.0 - clampf(angle / FLIP, 0.0, 1.0))
	draw_rect(Rect2(bx - 8, cy - 5, 46, 10), Color.WHITE)

	if state == State.WAIT:
		draw_string(font, Vector2(0, 360), "Segure o lado DIREITO para empinar", HORIZONTAL_ALIGNMENT_CENTER, size.x, 56, Color.WHITE)
		draw_string(font, Vector2(0, 430), "Lado ESQUERDO freia. Mantenha no marcador verde!", HORIZONTAL_ALIGNMENT_CENTER, size.x, 36, Color(1, 1, 1, 0.85))
	elif state == State.CRASH:
		draw_rect(Rect2(Vector2.ZERO, size), Color(0, 0, 0, 0.35))
		draw_string(font, Vector2(0, 400), crash_reason, HORIZONTAL_ALIGNMENT_CENTER, size.x, 72, Color(1, 0.4, 0.3))
		draw_string(font, Vector2(0, 480), "Pontos: %d" % int(score), HORIZONTAL_ALIGNMENT_CENTER, size.x, 48, Color.WHITE)
		if crash_time > 0.6:
			draw_string(font, Vector2(0, 560), "Toque para tentar de novo", HORIZONTAL_ALIGNMENT_CENTER, size.x, 40, Color(1, 1, 0.7))
