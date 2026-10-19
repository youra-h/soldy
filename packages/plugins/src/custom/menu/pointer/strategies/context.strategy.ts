import { isAppleTouch, isMeasurableElement } from '../../../../utils'
import type { IDomEventTarget } from '../../../../utils'
import type { IMenuOpenHost, IMenuOpenStrategy, TMenuContextPress } from './types'

/** Сколько держать палец, чтобы вызвать контекстное меню, мс, — как у системы. */
const LONG_PRESS_DELAY = 500

/** Насколько палец уходит, пока его держат, px: дальше — уже прокрутка, а не вызов. */
const LONG_PRESS_SLOP = 10

/** Вторая кнопка мыши и кнопка пера: её нажатие вызывает контекстное меню. */
const SECONDARY_BUTTON = 2

/** Системная выноска iOS на долгое касание — ссылки, картинки: её место занимает меню. */
const CALLOUT = '-webkit-touch-callout'

/**
 * TMenuContextStrategy — контекстное меню области (`openOn: 'contextmenu'`):
 * панель встаёт у точки вызова.
 *
 * **Вызов — `contextmenu` на корне.** Его шлёт браузер на правую кнопку мыши,
 * на долгое касание (Android) и с клавиатуры — на клавишу контекстного меню и
 * Shift+F10 элементу под фокусом, с точкой у него. `preventDefault` убирает
 * системное меню, и `contextmenu`, уже погашенное (вложенное контекстное
 * меню вызвали раньше), не трогается: вызов один. Вызов у открытого меню
 * переставляет панель к новой точке, а не закрывает и открывает её заново.
 *
 * **Чем вызвали**, плагин узнаёт по нажатию в области: перед `contextmenu`
 * указателя было `pointerdown`, клавиатуры — `keydown`. Вызов клавишей
 * открывает меню на первом пункте, как кнопку с клавиатуры, указателем —
 * фокус на панели. Своего признака в событии нет: у вызова с клавиатуры
 * Chromium отдаёт `pointerType` мыши. Нажатия в области не было вовсе
 * (меню вызвала ассистивная технология) — вызов клавишей.
 *
 * **Долгое касание** — свой таймер только там, где браузер `contextmenu` на
 * него не шлёт: на сенсорных устройствах Apple (`isAppleTouch`). Палец или
 * перо, ушедшие дальше порога, — прокрутка, и вызова нет; второй палец —
 * масштаб, тоже. Браузер, приславший `contextmenu` раньше таймера, таймер
 * снимает: вызов один. Системное меню долгого касания там — выноска над
 * ссылкой и картинкой, и `preventDefault` её не убирает: её снимает
 * `-webkit-touch-callout: none` на корне, пока стратегия стоит, а потом
 * возвращается прежнее инлайновое значение. Ставит его стратегия, а не тема:
 * без него не работает поведение, а не вид, — как `touch-action` у
 * `TSwipePlugin`.
 *
 * **Нажатие в области мимо вызова закрывает меню**: область — не кнопка, и
 * нажатие на неё — то же, что нажатие мимо. Мышь — на `pointerdown`, как у
 * `TDismissPlugin`, кроме второй кнопки: за ней придёт `contextmenu`, и
 * панель переедет. Палец и перо — на `pointerup` того же нажатия: с нажатия
 * начинается и прокрутка, и долгое касание, которое меню переставит.
 * `TDismissPlugin` эти нажатия мимо не считает: корень — внутри владельца,
 * — поэтому решает их стратегия, знающая, где вызов.
 */
export class TMenuContextStrategy implements IMenuOpenStrategy {
	/** Узел нужен под слушатели и под документ, чьё устройство спрашиваем. */
	private readonly _root: Element
	private readonly _host: IMenuOpenHost
	/** Долгое касание — своё: браузер `contextmenu` на него не шлёт. */
	private readonly _longPress: boolean
	/** Последнее нажатие в области — клавиша, а не указатель. */
	private _byKeyboard = true
	/** Нажатие пальцем или пером, которое ещё решается. */
	private _press: TMenuContextPress | null = null
	/** Инлайновая выноска корня до стратегии; `null` — стратегия её не трогала. */
	private _callout: string | null = null

	constructor(root: Element, host: IMenuOpenHost) {
		this._root = root
		this._host = host
		this._longPress = isAppleTouch(root.ownerDocument.defaultView?.navigator)

		if (this._longPress && isMeasurableElement(root)) {
			this._callout = root.style.getPropertyValue(CALLOUT)
			root.style.setProperty(CALLOUT, 'none')
		}

		const target: IDomEventTarget = root

		target.addEventListener('contextmenu', this._onContextMenu)
		// В фазе перехвата: чем вызвали меню, решает нажатие, даже если
		// содержимое области его дальше не пустило
		target.addEventListener('keydown', this._onKeyDown, true)
		target.addEventListener('pointerdown', this._onPointerDown, true)
		target.addEventListener('pointermove', this._onPointerMove)
		target.addEventListener('pointerup', this._onPointerUp)
		target.addEventListener('pointercancel', this._onPointerCancel)
	}

	destroy(): void {
		this._dropPress()
		this._restoreCallout()

		const target: IDomEventTarget = this._root

		target.removeEventListener('contextmenu', this._onContextMenu)
		target.removeEventListener('keydown', this._onKeyDown, true)
		target.removeEventListener('pointerdown', this._onPointerDown, true)
		target.removeEventListener('pointermove', this._onPointerMove)
		target.removeEventListener('pointerup', this._onPointerUp)
		target.removeEventListener('pointercancel', this._onPointerCancel)
	}

	/** Вернуть корню инлайновую выноску, что была до стратегии: пустая — снять свойство. */
	private _restoreCallout(): void {
		const root = this._root
		const callout = this._callout

		if (callout === null || !isMeasurableElement(root)) return

		this._callout = null

		if (callout === '') {
			root.style.removeProperty(CALLOUT)
		} else {
			root.style.setProperty(CALLOUT, callout)
		}
	}

	private readonly _onContextMenu = (event: MouseEvent): void => {
		if (event.defaultPrevented) return

		event.preventDefault()

		// Нажатие стало вызовом: таймер не нужен, а отпускание меню не закроет
		this._settlePress()
		this._host.invoke({ x: event.clientX, y: event.clientY }, this._byKeyboard)
	}

	private readonly _onKeyDown = (): void => {
		this._byKeyboard = true
	}

	private readonly _onPointerDown = (event: PointerEvent): void => {
		this._byKeyboard = false
		this._dropPress()

		if (event.pointerType === 'mouse') {
			if (event.button !== SECONDARY_BUTTON && this._host.isOpen) this._host.close()

			return
		}

		// Второй палец — масштаб, а не вызов
		if (!event.isPrimary) return

		const closes = this._host.isOpen && event.button !== SECONDARY_BUTTON

		if (!closes && !this._longPress) return

		this._press = {
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			closes,
			timer: this._longPress ? setTimeout(this._onLongPress, LONG_PRESS_DELAY) : null,
		}
	}

	/** Палец ушёл дальше порога — это прокрутка: ни вызова, ни закрытия. */
	private readonly _onPointerMove = (event: PointerEvent): void => {
		const press = this._press

		if (!press || event.pointerId !== press.pointerId) return

		if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > LONG_PRESS_SLOP) {
			this._dropPress()
		}
	}

	/** Отпустили, не вызвав меню, — нажатие в области у открытого меню закрывает его. */
	private readonly _onPointerUp = (event: PointerEvent): void => {
		const press = this._press

		if (!press || event.pointerId !== press.pointerId) return

		this._dropPress()

		if (press.closes && this._host.isOpen) this._host.close()
	}

	/** Браузер забрал касание под прокрутку или жест — решать нечего. */
	private readonly _onPointerCancel = (event: PointerEvent): void => {
		if (event.pointerId === this._press?.pointerId) this._dropPress()
	}

	/** Палец продержали — вызов у точки нажатия. */
	private readonly _onLongPress = (): void => {
		const press = this._press

		if (!press) return

		this._settlePress()
		this._host.invoke({ x: press.x, y: press.y }, false)
	}

	/** Нажатие стало вызовом: таймер снят, отпускание меню не закроет. */
	private _settlePress(): void {
		const press = this._press

		if (!press) return

		if (press.timer !== null) clearTimeout(press.timer)

		press.timer = null
		press.closes = false
	}

	/** Нажатия больше нет: таймер снят. */
	private _dropPress(): void {
		const press = this._press

		if (press && press.timer !== null) clearTimeout(press.timer)

		this._press = null
	}
}
