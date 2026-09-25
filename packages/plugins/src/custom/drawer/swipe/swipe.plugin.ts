import { FRAME_LAYER_ATTRIBUTE } from '@soldy-ui/core'
import type { IDrawer, TDrawerPlacement } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import type { IDomEventTarget } from '../../../utils'
import { closestControl, isMeasurableElement } from '../../../utils'
import type {
	TDrawerSwipeAxis,
	TDrawerSwipeGesture,
	TDrawerSwipePluginEvents,
	TDrawerSwipePress,
} from './types'

/**
 * Переменная сдвига панели во время жеста — контракт с темой. Значение — px
 * по оси панели, со знаком оси окна: у панели справа сдвиг к краю
 * положительный, слева — отрицательный. Тема кладёт её в `translate` открытой
 * панели; без жеста переменной нет.
 */
const SWIPE_VARIABLE = '--drawer-swipe'

/** Сколько пройти от точки нажатия, чтобы нажатие стало жестом, px. */
const START_DISTANCE = 6

/** Отпустили дальше этой доли размера панели — закрыть. */
const CLOSE_FRACTION = 0.25

/** Отпустили быстрее этого к краю — закрыть, как ни мал путь, px/мс. */
const CLOSE_VELOCITY = 0.4

/** Окно скорости: по точкам за столько последних мс перед отпусканием. */
const VELOCITY_WINDOW = 100

/**
 * Предел сопротивления за открытым положением, px: сколько ни тяни от края,
 * панель отойдёт от него не дальше.
 */
const OVERSHOOT = 24

/** Инлайновые свойства, которыми жест гасит выделение текста. */
const USER_SELECT = ['user-select', '-webkit-user-select'] as const

/** Ось панели: у верхнего и нижнего края — по вертикали. */
function axisOf(placement: TDrawerPlacement): TDrawerSwipeAxis {
	return placement === 'top' || placement === 'bottom' ? 'y' : 'x'
}

/**
 * Куда по оси окна панель уезжает к своему краю. `start` и `end` —
 * логические: в RTL начало строки справа, и жест зеркалится вместе с
 * панелью. Направление — вычисленное, как у `TAnchorPlugin`: у панели бывает
 * `direction: inherit`, и сторону задаёт предок.
 */
function closingSign(placement: TDrawerPlacement, rtl: boolean): 1 | -1 {
	if (placement === 'bottom') return 1
	if (placement === 'top') return -1

	return (placement === 'end') !== rtl ? 1 : -1
}

/** Сопротивление за открытым положением: чем дальше тянут, тем меньше отдаёт панель. */
function resist(distance: number): number {
	return (OVERSHOOT * distance) / (OVERSHOOT + distance)
}

/**
 * Лежит ли узел в области, которая прокручивается вдоль оси, — между узлом и
 * корнем. Такая область прокручивается сама, и жест из неё не начинается.
 * Прокрутку поперёк оси жест не трогает: тянут вдоль.
 */
function scrollsAlong(node: Element, root: Element, axis: TDrawerSwipeAxis): boolean {
	for (let current: Element | null = node; current && current !== root; ) {
		if (isMeasurableElement(current)) {
			const style = getComputedStyle(current)
			const overflow = axis === 'y' ? style.overflowY : style.overflowX
			const scrollable =
				axis === 'y'
					? current.scrollHeight > current.clientHeight
					: current.scrollWidth > current.clientWidth

			if ((overflow === 'auto' || overflow === 'scroll') && scrollable) return true
		}

		current = current.parentElement
	}

	return false
}

/**
 * TDrawerSwipePlugin — жест выезжающей панели: смахнуть её к её краю, чтобы
 * закрыть.
 *
 * За что тянуть, выбирает владелец (`swipe`): за полосу у края (`handle`) или
 * за любое место панели (`panel`), кроме контролов (`closestControl`) и
 * областей, которые прокручиваются вдоль оси, — те прокручиваются сами. За
 * всю панель жест не начинается и тогда, когда в ней выделен текст: его
 * тянут, а не панель.
 *
 * **Нажатие становится жестом**, когда указатель ушёл от точки нажатия вдоль
 * оси панели дальше порога. Ушёл поперёк — это не жест панели: прокрутка,
 * выделение, чужой жест, — и нажатие отпускается. Жест начинает владелец
 * (`beginSwipe`): у него признак «тянут», по которому тема снимает переход, —
 * иначе панель догоняла бы палец с опозданием.
 *
 * **Сдвиг во время жеста — операция над узлом**, а не значение: плагин
 * пишет его в корень переменной `--drawer-swipe`, и через обмен на каждом
 * кадре он не ходит. К краю панель идёт за указателем, но не дальше своего
 * размера; от края — с сопротивлением.
 *
 * **Отпустили** дальше четверти размера или быстро к краю — плагин закрывает
 * панель запросом с причиной `swipe`: подписчик `close:before` вправе его
 * отменить. Иначе — и когда запрос отменили — панель возвращается: признак
 * «тянут» снят, и сдвиг уходит кадром позже, когда переход у темы уже снова
 * включён. Браузер отнял указатель (`pointercancel`) — это не решение
 * пользователя, и панель возвращается тоже.
 *
 * **Касание.** Пока жест включён, плагин ставит корню `touch-action` по оси
 * панели: без него браузер забрал бы касание под прокрутку страницы, и жест
 * не работал бы пальцем, а поведение не должно зависеть от CSS темы.
 * Прокручиваемая область внутри панели остаётся своей: по правилам
 * `touch-action` цепочка кончается на ней.
 *
 * Своих действий у нажатия на полосу нет (`preventDefault`): ни выделения, ни
 * фокуса на саму панель. Нажатие по содержимому своих действий не теряет, а
 * выделение, начатое им, жест снимает и гасит до конца. `click`, которым
 * кончается жест, гасится: отпускание — не нажатие.
 *
 * Слушатели висят, только пока жест включён и панель открыта: это подписка на
 * `change:swipe`, открытость и край, а не проверка в обработчике.
 */
export class TDrawerSwipePlugin extends TBasePlugin<IDrawer, TDrawerSwipePluginEvents> {
	private _owner: IDrawer | null = null
	private _root: Element | null = null
	/** Корень, на котором жест включён; `null` — выключен. */
	private _target: HTMLElement | null = null
	/** Инлайновый `touch-action` корня до включения жеста. */
	private _touchAction = ''
	private _press: TDrawerSwipePress | null = null
	private _gesture: TDrawerSwipeGesture | null = null
	/** Жест кончился отпусканием: следующий `click` корня — его, а не пользователя. */
	private _swallowClick = false
	/** Кадр, в котором уйдёт сдвиг отпущенной панели; `null` — ничего не ждёт. */
	private _resetFrame: number | null = null
	private readonly _sync = (): void => this._resync()

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<IDrawer>()

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (node) => {
			this._root = node
			this._resync()
		})

		element?.events.on('removed', () => {
			this._root = null
			this._resync()
		})

		this._listenTo(this._owner?.events, 'change:swipe', this._sync)
		this._listenTo(this._owner?.events, 'change:visible', this._sync)
		this._listenTo(this._owner?.events, 'change:placement', this._sync)
	}

	override destroy(): void {
		this._detach()

		this._owner = null
		this._root = null

		super.destroy()
	}

	/** Жест включён ровно тогда, когда он выбран, панель открыта и корень объявлен. */
	private _resync(): void {
		const owner = this._owner
		const root = this._root

		this._detach()

		if (!owner || owner.swipe === 'none' || !owner.visible || !isMeasurableElement(root)) return

		this._attach(root, owner)
	}

	private _attach(root: HTMLElement, owner: IDrawer): void {
		const target: IDomEventTarget = root

		target.addEventListener('pointerdown', this._onPointerDown)
		target.addEventListener('pointermove', this._onPointerMove)
		target.addEventListener('pointerup', this._onPointerEnd)
		target.addEventListener('pointercancel', this._onPointerEnd)
		target.addEventListener('lostpointercapture', this._onPointerEnd)
		target.addEventListener('click', this._onClick)

		// Вдоль оси касание — жесту, поперёк — браузеру; масштаб — браузеру
		this._touchAction = root.style.getPropertyValue('touch-action')
		root.style.setProperty(
			'touch-action',
			axisOf(owner.placement) === 'y' ? 'pan-x pinch-zoom' : 'pan-y pinch-zoom',
		)

		this._target = root
	}

	private _detach(): void {
		const root = this._target

		this._press = null
		this._swallowClick = false

		if (!root) return

		const target: IDomEventTarget = root

		target.removeEventListener('pointerdown', this._onPointerDown)
		target.removeEventListener('pointermove', this._onPointerMove)
		target.removeEventListener('pointerup', this._onPointerEnd)
		target.removeEventListener('pointercancel', this._onPointerEnd)
		target.removeEventListener('lostpointercapture', this._onPointerEnd)
		target.removeEventListener('click', this._onClick)

		const gesture = this._gesture

		// Жест выключили посреди жеста: панель закрыли, сменили край или жест
		if (gesture) {
			this._gesture = null
			this._restoreSelect(root, gesture)

			if ('hasPointerCapture' in root && root.hasPointerCapture(gesture.pointer)) {
				root.releasePointerCapture(gesture.pointer)
			}

			this._owner?.endSwipe()
		}

		restoreStyle(root, 'touch-action', this._touchAction)

		this._cancelReset()
		root.style.removeProperty(SWIPE_VARIABLE)

		this._target = null
	}

	private readonly _onPointerDown = (event: PointerEvent): void => {
		const owner = this._owner
		const root = this._target

		// Нажатие — новое: `click` прошлого жеста, если его не было, уже не придёт
		this._swallowClick = false

		// Основная кнопка и первый палец; жест уже идёт — второй указатель его не перехватывает
		if (!owner || !root || this._gesture || !event.isPrimary || event.button !== 0) return

		if (!(event.target instanceof Element) || !this._grabbable(owner, root, event.target)) {
			this._press = null

			return
		}

		this._press = { pointer: event.pointerId, x: event.clientX, y: event.clientY }

		// Полоса — не содержимое: своего действия у нажатия на неё нет
		if (owner.swipe === 'handle') event.preventDefault()
	}

	/**
	 * Можно ли начать жест с узла. Узел — в своём слое: у панели, открытой
	 * внутри этой (`contained`), жест свой. Дальше — по выбору владельца: полоса
	 * или вся панель, кроме контролов, прокрутки вдоль оси и выделенного текста.
	 */
	private _grabbable(owner: IDrawer, root: HTMLElement, node: Element): boolean {
		if (node.closest(`[${FRAME_LAYER_ATTRIBUTE}]`) !== root) return false

		if (owner.swipe === 'handle') {
			const handle = node.closest(owner.classes.resolve('__handle', { point: true }))

			return handle?.parentElement === root
		}

		if (closestControl(node, root)) return false

		if (scrollsAlong(node, root, axisOf(owner.placement))) return false

		const selection = root.ownerDocument.getSelection()
		const anchor = selection?.anchorNode

		return !selection || selection.isCollapsed || !anchor || !root.contains(anchor)
	}

	private readonly _onPointerMove = (event: PointerEvent): void => {
		const gesture = this._gesture

		if (gesture) {
			if (event.pointerId === gesture.pointer) this._drag(gesture, event)

			return
		}

		const press = this._press
		const owner = this._owner

		if (!press || !owner || event.pointerId !== press.pointer) return

		const dx = event.clientX - press.x
		const dy = event.clientY - press.y
		const [along, across] = axisOf(owner.placement) === 'y' ? [dy, dx] : [dx, dy]

		// Ещё нажатие: указатель не ушёл от точки нажатия
		if (Math.abs(along) < START_DISTANCE && Math.abs(across) < START_DISTANCE) return

		this._press = null

		// Поперёк оси — не жест панели: прокрутка, выделение, чужой жест
		if (Math.abs(across) >= Math.abs(along)) return

		this._begin(owner, press, event)
	}

	private _begin(owner: IDrawer, press: TDrawerSwipePress, event: PointerEvent): void {
		const root = this._target

		if (!root || !owner.beginSwipe()) return

		const axis = axisOf(owner.placement)
		const box = root.getBoundingClientRect()
		// Нажатие по содержимому своего действия не теряло и могло начать
		// выделение текста. У полосы действия нет, и выделять нечего
		const content = owner.swipe === 'panel'
		const gesture: TDrawerSwipeGesture = {
			pointer: press.pointer,
			axis,
			sign: closingSign(owner.placement, getComputedStyle(root).direction === 'rtl'),
			origin: axis === 'y' ? press.y : press.x,
			size: axis === 'y' ? box.height : box.width,
			offset: 0,
			samples: [],
			userSelect: content
				? USER_SELECT.map((property) => [property, root.style.getPropertyValue(property)])
				: [],
		}

		this._gesture = gesture
		this._cancelReset()

		// Тянут панель, а не выделение: начатое нажатием снять и не продолжать
		if (content) {
			root.ownerDocument.getSelection()?.removeAllRanges()

			for (const property of USER_SELECT) root.style.setProperty(property, 'none')
		}

		// Протяжка за пределами панели и отпускание где угодно приходят корню.
		// Среда без захвата указателя (jsdom) ведёт жест без него
		if ('setPointerCapture' in root) root.setPointerCapture(press.pointer)

		this._drag(gesture, event)
	}

	/** Панель за указателем: к краю — не дальше своего размера, от края — с сопротивлением. */
	private _drag(gesture: TDrawerSwipeGesture, event: PointerEvent): void {
		const root = this._target
		const position = gesture.axis === 'y' ? event.clientY : event.clientX
		const distance = (position - gesture.origin) * gesture.sign
		const toEdge = gesture.size > 0 ? Math.min(distance, gesture.size) : distance

		gesture.offset = distance >= 0 ? toEdge : -resist(-distance)
		gesture.samples = [
			...gesture.samples.filter(({ time }) => time >= event.timeStamp - VELOCITY_WINDOW),
			{ time: event.timeStamp, distance },
		]

		root?.style.setProperty(SWIPE_VARIABLE, `${gesture.offset * gesture.sign}px`)
	}

	private readonly _onPointerEnd = (event: PointerEvent): void => {
		if (this._press?.pointer === event.pointerId) this._press = null

		const gesture = this._gesture

		if (!gesture || event.pointerId !== gesture.pointer) return

		// Отнятый указатель — решение браузера, а не пользователя: панель
		// возвращается. `click` за ним браузер не пришлёт
		if (event.type !== 'pointerup') {
			this._finish(gesture, false)

			return
		}

		this._drag(gesture, event)
		this._swallowClick = true
		this._finish(gesture, this._closes(gesture))
	}

	/** Закрыть ли отпущенную панель: путь к краю или скорость к краю. */
	private _closes(gesture: TDrawerSwipeGesture): boolean {
		const fraction = gesture.size > 0 ? gesture.offset / gesture.size : 0

		return (
			fraction >= CLOSE_FRACTION ||
			(gesture.offset > 0 && velocity(gesture) >= CLOSE_VELOCITY)
		)
	}

	/**
	 * Жест кончился. Признак «тянут» снимается сразу, а сдвиг — кадром позже:
	 * к этому кадру тема уже снова включила переход, и панель поедет — к краю,
	 * если закрылась, или на место. Сними сдвиг сразу — возврат фокуса при
	 * закрытии пересчитал бы стили раньше, и панель прыгнула бы на место.
	 */
	private _finish(gesture: TDrawerSwipeGesture, close: boolean): void {
		const root = this._target

		this._gesture = null

		if (root) {
			this._restoreSelect(root, gesture)
			this._scheduleReset(root)
		}

		this._owner?.endSwipe()

		if (close) this._owner?.requestClose('swipe')
	}

	private readonly _onClick = (event: MouseEvent): void => {
		if (!this._swallowClick) return

		this._swallowClick = false
		event.preventDefault()
	}

	private _restoreSelect(root: HTMLElement, gesture: TDrawerSwipeGesture): void {
		for (const [property, value] of gesture.userSelect) restoreStyle(root, property, value)
	}

	private _scheduleReset(root: HTMLElement): void {
		this._cancelReset()
		this._resetFrame = requestAnimationFrame(() => {
			this._resetFrame = null
			root.style.removeProperty(SWIPE_VARIABLE)
		})
	}

	private _cancelReset(): void {
		if (this._resetFrame === null) return

		cancelAnimationFrame(this._resetFrame)
		this._resetFrame = null
	}
}

/**
 * Скорость к краю в конце жеста, px/мс: по точкам окна скорости. Одна точка
 * — указатель стоял перед отпусканием, скорости нет.
 */
function velocity(gesture: TDrawerSwipeGesture): number {
	const first = gesture.samples[0]
	const last = gesture.samples[gesture.samples.length - 1]

	if (!first || !last || last.time <= first.time) return 0

	return (last.distance - first.distance) / (last.time - first.time)
}

/** Вернуть инлайновое значение, которое было до плагина: пустое — снять свойство. */
function restoreStyle(root: HTMLElement, property: string, value: string): void {
	if (value === '') {
		root.style.removeProperty(property)
	} else {
		root.style.setProperty(property, value)
	}
}
