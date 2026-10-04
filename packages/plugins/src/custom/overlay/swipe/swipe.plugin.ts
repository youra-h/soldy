import { FRAME_LAYER_ATTRIBUTE, isSwipeable } from '@soldy-ui/core'
import type { TSwipeSide } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TDismissPlugin } from '../../dismiss'
import { ANCHOR_PLACEMENT_ATTRIBUTE } from '../../frame/anchor'
import type { IDomEventTarget } from '../../../utils'
import { closestControl, isMeasurableElement } from '../../../utils'
import { bindOverlayOpen } from '../open-state'
import type { IOverlayOpenOptions, IOverlayOpenState } from '../types'
import type {
	ISwipeOwner,
	TSwipeAxis,
	TSwipeGesture,
	TSwipePluginEvents,
	TSwipePress,
} from './types'

/**
 * Переменная сдвига панели во время жеста — контракт с темой. Значение — px
 * по оси жеста, со знаком оси окна: у панели, которая уходит вправо или вниз,
 * сдвиг к краю положительный, влево или вверх — отрицательный. Тема кладёт её
 * в `translate` панели; без жеста переменной нет.
 */
const SWIPE_VARIABLE = '--s-swipe-offset'

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

/**
 * Ось жеста: к началу или концу строки — по горизонтали, вверх или вниз — по
 * вертикали. Сторона у якоря (`null`) — тоже вертикаль: якорь ставит панель
 * под триггером или над ним.
 */
function axisOf(side: TSwipeSide | null): TSwipeAxis {
	return side === 'start' || side === 'end' ? 'x' : 'y'
}

/**
 * Куда по оси окна слой уходит. `start` и `end` — логические: в RTL начало
 * строки справа, и жест зеркалится вместе со слоем. Направление — вычисленное,
 * как у `TAnchorPlugin`: у панели бывает `direction: inherit`, и сторону задаёт
 * предок.
 */
function closingSign(side: TSwipeSide, rtl: boolean): 1 | -1 {
	if (side === 'bottom') return 1
	if (side === 'top') return -1

	return (side === 'end') !== rtl ? 1 : -1
}

/**
 * Сторона панели у якоря после flip — её пишет `TAnchorPlugin` в самой панели
 * (`data-placement`): `top…` — над триггером, `bottom…` — под ним. Панель
 * уходит от триггера, то есть к этой же стороне. Атрибута нет — панель не у
 * якоря, и уходить ей некуда.
 */
function anchoredSide(panel: Element): TSwipeSide | null {
	const placement = panel.getAttribute(ANCHOR_PLACEMENT_ATTRIBUTE)

	if (placement?.startsWith('top')) return 'top'
	if (placement?.startsWith('bottom')) return 'bottom'

	return null
}

/** Сопротивление за открытым положением: чем дальше тянут, тем меньше отдаёт панель. */
function resist(distance: number): number {
	return (OVERSHOOT * distance) / (OVERSHOOT + distance)
}

/**
 * Лежит ли узел в области, которая прокручивается вдоль оси, — между узлом и
 * панелью. Такая область прокручивается сама, и жест из неё не начинается.
 * Прокрутку поперёк оси жест не трогает: тянут вдоль.
 */
function scrollsAlong(node: Element, panel: Element, axis: TSwipeAxis): boolean {
	for (let current: Element | null = node; current && current !== panel; ) {
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
 * TSwipePlugin — жест слоя: смахнуть панель, чтобы закрыть.
 *
 * Общий для слоёв, которые смахивают (`ISwipeable`): выезжающая панель уходит
 * к своему краю, поповер — от триггера, а внутри контейнера — к своему краю. С
 * владельцем плагин говорит только через контракт: класса ядра не требует, а
 * владельца без контракта не трогает.
 *
 * **Панель** — узел, который тянут. Это узел с пометкой владельцем
 * (`TDismissPlugin.findPanel()`): панель поповера телепортирована, и ссылки на
 * неё у плагинов нет. Без пометки — корень: у выезжающей панели корень и есть
 * панель. Так же панель находят `THideOutsidePlugin` и плагины фокуса.
 *
 * **Куда уходит слой**, знает ядро (`swipeSide`) — кроме панели у якоря: под
 * триггером она или над ним, решает flip `TAnchorPlugin`, и знает это только
 * её узел (`data-placement`). Тогда сторона берётся с узла в начале жеста, а
 * ось у такой панели всегда вертикальная.
 *
 * За что тянуть, выбирает владелец (`swipe`): за полосу (`handle`) или за любое
 * место панели (`panel`), кроме контролов (`closestControl`) и областей,
 * которые прокручиваются вдоль оси, — те прокручиваются сами. За всю панель
 * жест не начинается и тогда, когда в ней выделен текст: его тянут, а не
 * панель.
 *
 * **Нажатие становится жестом**, когда указатель ушёл от точки нажатия вдоль
 * оси дальше порога. Ушёл поперёк — это не жест панели: прокрутка, выделение,
 * чужой жест, — и нажатие отпускается. Жест начинает владелец (`beginSwipe`):
 * у него признак «тянут», по которому тема снимает переход, — иначе панель
 * догоняла бы палец с опозданием.
 *
 * **Сдвиг во время жеста — операция над узлом**, а не значение: плагин пишет
 * его в панель переменной `--s-swipe-offset`, и через обмен на каждом кадре он
 * не ходит. К краю панель идёт за указателем, но не дальше своего размера; от
 * края — с сопротивлением.
 *
 * **Отпустили** дальше четверти размера или быстро к краю — плагин закрывает
 * слой с причиной `swipe` тем же путём, что нажатие мимо и Escape
 * (`bindOverlayOpen`): запросом у владельца, который его принимает (подписчик
 * `close:before` вправе его отменить), записью открытости у остальных. Иначе —
 * и когда запрос отменили — панель возвращается: признак «тянут» снят, и сдвиг
 * уходит кадром позже, когда переход у темы уже снова включён. Браузер отнял
 * указатель (`pointercancel`) — это не решение пользователя, и панель
 * возвращается тоже.
 *
 * **Касание.** Пока жест включён, плагин ставит панели `touch-action` по оси:
 * без него браузер забрал бы касание под прокрутку страницы, и жест не работал
 * бы пальцем, а поведение не должно зависеть от CSS темы. Прокручиваемая
 * область внутри панели остаётся своей: по правилам `touch-action` цепочка
 * кончается на ней.
 *
 * Своих действий у нажатия на полосу нет (`preventDefault`): ни выделения, ни
 * фокуса на саму панель. Нажатие по содержимому своих действий не теряет, а
 * выделение, начатое им, жест снимает и гасит до конца. `click`, которым
 * кончается жест, гасится: отпускание — не нажатие.
 *
 * Слушатели висят, только пока жест включён и слой открыт: это подписка на
 * `change:swipe`, сторону ухода и открытость (`property`, по умолчанию `open`,
 * как у других плагинов слоя), а не проверка в обработчике.
 */
export class TSwipePlugin extends TBasePlugin<ISwipeOwner, TSwipePluginEvents> {
	private _owner: ISwipeOwner | null = null
	/** Открытость владельца: по ней жест включается, ею же слой закрывается. */
	private _open: IOverlayOpenState | null = null
	private _dismiss: TDismissPlugin | null = null
	private _root: Element | null = null
	/** Панель, на которой жест включён; `null` — выключен. */
	private _target: HTMLElement | null = null
	/** Инлайновый `touch-action` панели до включения жеста. */
	private _touchAction = ''
	private _press: TSwipePress | null = null
	private _gesture: TSwipeGesture | null = null
	/** Жест кончился отпусканием: следующий `click` панели — его, а не пользователя. */
	private _swallowClick = false
	/** Кадр, в котором уйдёт сдвиг отпущенной панели; `null` — ничего не ждёт. */
	private _resetFrame: number | null = null
	private readonly _sync = (): void => this._resync()

	override install(ctx: IPluginContext, options?: IOverlayOpenOptions): void {
		super.install(ctx, options)

		const owner = ctx.getInstance<ISwipeOwner>()

		this._owner = isSwipeable(owner) ? owner : null
		this._dismiss = ctx.get(TDismissPlugin) ?? null

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (node) => {
			this._root = node
			this._resync()
		})

		element?.events.on('removed', () => {
			this._root = null
			this._resync()
		})

		// Без контракта жеста тянуть некого — и открытость слушать незачем
		if (!this._owner) return

		this._listenTo(this._owner.events, 'change:swipe', this._sync)
		this._listenTo(this._owner.events, 'change:swipeSide', this._sync)

		this._open = bindOverlayOpen(ctx, options, this._sync)
	}

	override destroy(): void {
		this._detach()

		this._open?.unbind()
		this._open = null
		this._owner = null
		this._dismiss = null
		this._root = null

		super.destroy()
	}

	/**
	 * Жест включён ровно тогда, когда он выбран, слой открыт, а корень объявлен.
	 * Панель — узел с пометкой владельцем, без неё — корень.
	 */
	private _resync(): void {
		const owner = this._owner
		const root = this._root

		this._detach()

		if (!owner || owner.swipe === 'none' || !this._open?.read() || !root) return

		const panel = this._dismiss?.findPanel() ?? root

		if (!isMeasurableElement(panel)) return

		this._attach(panel, owner)
	}

	private _attach(panel: HTMLElement, owner: ISwipeOwner): void {
		const target: IDomEventTarget = panel

		target.addEventListener('pointerdown', this._onPointerDown)
		target.addEventListener('pointermove', this._onPointerMove)
		target.addEventListener('pointerup', this._onPointerEnd)
		target.addEventListener('pointercancel', this._onPointerEnd)
		target.addEventListener('lostpointercapture', this._onPointerEnd)
		target.addEventListener('click', this._onClick)

		// Вдоль оси касание — жесту, поперёк — браузеру; масштаб — браузеру
		this._touchAction = panel.style.getPropertyValue('touch-action')
		panel.style.setProperty(
			'touch-action',
			axisOf(owner.swipeSide) === 'y' ? 'pan-x pinch-zoom' : 'pan-y pinch-zoom',
		)

		this._target = panel
	}

	private _detach(): void {
		const panel = this._target

		this._press = null
		this._swallowClick = false

		if (!panel) return

		const target: IDomEventTarget = panel

		target.removeEventListener('pointerdown', this._onPointerDown)
		target.removeEventListener('pointermove', this._onPointerMove)
		target.removeEventListener('pointerup', this._onPointerEnd)
		target.removeEventListener('pointercancel', this._onPointerEnd)
		target.removeEventListener('lostpointercapture', this._onPointerEnd)
		target.removeEventListener('click', this._onClick)

		const gesture = this._gesture

		// Жест выключили посреди жеста: слой закрыли, сменили сторону или жест
		if (gesture) {
			this._gesture = null
			this._restoreSelect(panel, gesture)

			if ('hasPointerCapture' in panel && panel.hasPointerCapture(gesture.pointer)) {
				panel.releasePointerCapture(gesture.pointer)
			}

			this._owner?.endSwipe()
		}

		restoreStyle(panel, 'touch-action', this._touchAction)

		this._cancelReset()
		panel.style.removeProperty(SWIPE_VARIABLE)

		this._target = null
	}

	private readonly _onPointerDown = (event: PointerEvent): void => {
		const owner = this._owner
		const panel = this._target

		// Нажатие — новое: `click` прошлого жеста, если его не было, уже не придёт
		this._swallowClick = false

		// Основная кнопка и первый палец; жест уже идёт — второй указатель его не перехватывает
		if (!owner || !panel || this._gesture || !event.isPrimary || event.button !== 0) return

		if (!(event.target instanceof Element) || !this._grabbable(owner, panel, event.target)) {
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
	private _grabbable(owner: ISwipeOwner, panel: HTMLElement, node: Element): boolean {
		if (node.closest(`[${FRAME_LAYER_ATTRIBUTE}]`) !== panel) return false

		if (owner.swipe === 'handle') {
			const handle = node.closest(owner.classes.resolve('__handle', { point: true }))

			return handle?.parentElement === panel
		}

		if (closestControl(node, panel)) return false

		if (scrollsAlong(node, panel, axisOf(owner.swipeSide))) return false

		const selection = panel.ownerDocument.getSelection()
		const anchor = selection?.anchorNode

		return !selection || selection.isCollapsed || !anchor || !panel.contains(anchor)
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
		const [along, across] = axisOf(owner.swipeSide) === 'y' ? [dy, dx] : [dx, dy]

		// Ещё нажатие: указатель не ушёл от точки нажатия
		if (Math.abs(along) < START_DISTANCE && Math.abs(across) < START_DISTANCE) return

		this._press = null

		// Поперёк оси — не жест панели: прокрутка, выделение, чужой жест
		if (Math.abs(across) >= Math.abs(along)) return

		this._begin(owner, press, event)
	}

	private _begin(owner: ISwipeOwner, press: TSwipePress, event: PointerEvent): void {
		const panel = this._target

		if (!panel) return

		// Сторону панели у якоря знает только её узел
		const side = owner.swipeSide ?? anchoredSide(panel)

		if (!side || !owner.beginSwipe()) return

		const axis = axisOf(side)
		const box = panel.getBoundingClientRect()
		// Нажатие по содержимому своего действия не теряло и могло начать
		// выделение текста. У полосы действия нет, и выделять нечего
		const content = owner.swipe === 'panel'
		const gesture: TSwipeGesture = {
			pointer: press.pointer,
			axis,
			sign: closingSign(side, getComputedStyle(panel).direction === 'rtl'),
			origin: axis === 'y' ? press.y : press.x,
			size: axis === 'y' ? box.height : box.width,
			offset: 0,
			samples: [],
			userSelect: content
				? USER_SELECT.map((property) => [property, panel.style.getPropertyValue(property)])
				: [],
		}

		this._gesture = gesture
		this._cancelReset()

		// Тянут панель, а не выделение: начатое нажатием снять и не продолжать
		if (content) {
			panel.ownerDocument.getSelection()?.removeAllRanges()

			for (const property of USER_SELECT) panel.style.setProperty(property, 'none')
		}

		// Протяжка за пределами панели и отпускание где угодно приходят панели.
		// Среда без захвата указателя (jsdom) ведёт жест без него
		if ('setPointerCapture' in panel) panel.setPointerCapture(press.pointer)

		this._drag(gesture, event)
	}

	/** Панель за указателем: к краю — не дальше своего размера, от края — с сопротивлением. */
	private _drag(gesture: TSwipeGesture, event: PointerEvent): void {
		const panel = this._target
		const position = gesture.axis === 'y' ? event.clientY : event.clientX
		const distance = (position - gesture.origin) * gesture.sign
		const toEdge = gesture.size > 0 ? Math.min(distance, gesture.size) : distance

		gesture.offset = distance >= 0 ? toEdge : -resist(-distance)
		gesture.samples = [
			...gesture.samples.filter(({ time }) => time >= event.timeStamp - VELOCITY_WINDOW),
			{ time: event.timeStamp, distance },
		]

		panel?.style.setProperty(SWIPE_VARIABLE, `${gesture.offset * gesture.sign}px`)
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
	private _closes(gesture: TSwipeGesture): boolean {
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
	private _finish(gesture: TSwipeGesture, close: boolean): void {
		const panel = this._target

		this._gesture = null

		if (panel) {
			this._restoreSelect(panel, gesture)
			this._scheduleReset(panel)
		}

		this._owner?.endSwipe()

		if (close) this._open?.close('swipe')
	}

	private readonly _onClick = (event: MouseEvent): void => {
		if (!this._swallowClick) return

		this._swallowClick = false
		event.preventDefault()
	}

	private _restoreSelect(panel: HTMLElement, gesture: TSwipeGesture): void {
		for (const [property, value] of gesture.userSelect) restoreStyle(panel, property, value)
	}

	private _scheduleReset(panel: HTMLElement): void {
		this._cancelReset()
		this._resetFrame = requestAnimationFrame(() => {
			this._resetFrame = null
			panel.style.removeProperty(SWIPE_VARIABLE)
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
function velocity(gesture: TSwipeGesture): number {
	const first = gesture.samples[0]
	const last = gesture.samples[gesture.samples.length - 1]

	if (!first || !last || last.time <= first.time) return 0

	return (last.distance - first.distance) / (last.time - first.time)
}

/** Вернуть инлайновое значение, которое было до плагина: пустое — снять свойство. */
function restoreStyle(panel: HTMLElement, property: string, value: string): void {
	if (value === '') {
		panel.style.removeProperty(property)
	} else {
		panel.style.setProperty(property, value)
	}
}
