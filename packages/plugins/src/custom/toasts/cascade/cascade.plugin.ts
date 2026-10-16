import type { IToasts, IToastsItem, TToastsCollection } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import { isFocusableElement } from '../../../utils'
import type { IDomEventTarget } from '../../../utils'
import type { TCascadeStep, TToastsCascadePluginEvents, TWheelGesture } from './types'

/**
 * Сколько прокрутить колесом, чтобы стопка сделала шаг, px. Щелчок колеса
 * мыши — около сотни пикселей, и шаг он делает сразу. Тачпад шлёт события
 * мелкими долями, и они копятся: случайное касание стопку не листает.
 */
const WHEEL_STEP = 50

/**
 * Тишина колеса, после которой жест кончился, мс. Инерция тачпада и щелчки,
 * идущие подряд, — один жест и один шаг: стопка из трёх тостов иначе
 * пролисталась бы одним взмахом по кругу.
 */
const WHEEL_GESTURE_END = 200

/** Поле, которому стрелки нужны самому: ввод, выбор, редактируемый текст. */
const TAKES_ARROWS = 'input, select, textarea, [contenteditable]:not([contenteditable="false"])'

/**
 * TToastsCascadePlugin — листание стопки тостов (`layout: 'cascade'`).
 *
 * В стопке тосты перекрывают друг друга. Передний — первый по порядку
 * коллекции, а вывести задний вперёд — перестановка (`plain.move`): своего
 * состояния «передний» у тоста нет, и экран со скринридером видят один
 * порядок. Шаг стопки — поворот открытых показанных тостов по кругу:
 *
 * - **колесо** над регионом: вниз — передний уходит назад, вверх — задний
 *   выходит вперёд. Шаг один на жест колеса (`WHEEL_GESTURE_END`), прокрутка
 *   копится до порога (`WHEEL_STEP`), колесо жеста гасится — страница под
 *   стопкой не едет. Колесо с Ctrl — масштаб окна, а вбок — не наше;
 * - **стрелки ↓ и ↑** при фокусе на тосте — то же самое, и фокус переходит на
 *   новый передний: тот, кого читают, всегда впереди. Стрелки поля ввода и
 *   списка в своём содержимом тоста не перехватываются, погашенные раньше —
 *   тоже.
 *
 * **Передний для шага — тост под фокусом.** Фокус Tab на заднем тосте выводит
 * его вперёд темой, по `:focus-within`, без перестановки: перестановка на
 * фокус ставила бы тост под фокусом первым в документе, и следующий Tab
 * приходил бы в прежний передний — по кругу, без выхода из региона. Поэтому
 * шаг считается от того, что видно: тост под фокусом впереди, остальные — за
 * ним по порядку.
 *
 * Закрытые тосты, которые ещё гаснут, в повороте не участвуют и встают за
 * открытыми; ждущие за пределом видимых не трогаются. Открытых меньше двух —
 * листать нечего, и колесо со стрелками остаются странице.
 *
 * **Фокус после перерисовки.** Переставленный узел браузер переносит в
 * документе, и фокус с него уходит. Поэтому, если фокус был на тосте, плагин
 * ставит его новому переднему сразу и ещё раз кадром позже, когда разметка уже
 * переставлена, — как перестановка колонки Table.
 *
 * Без стопки (`list`) плагин ничего не делает: колесо и стрелки остаются
 * странице. Слушатели висят, пока есть узел региона.
 */
export class TToastsCascadePlugin extends TBasePlugin<IToasts, TToastsCascadePluginEvents> {
	private _owner: IToasts | null = null
	private _engine: TToastsCollection | null = null
	private _elements: TCollectionElements | null = null
	/** Узел региона: на нём слушатели колеса и клавиш. */
	private _region: (IDomEventTarget & Node) | null = null
	/** Жест колеса; `null` — колесо стоит. */
	private _gesture: TWheelGesture | null = null
	/** Конец жеста — по тишине колеса. */
	private _gestureTimer: ReturnType<typeof setTimeout> | null = null
	/** Возврат фокуса после перерисовки. */
	private _frame: number | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<IToasts>()
		this._elements = ctx.get(TCollectionElements) ?? null

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (node) => this._attach(node))
		element?.events.on('removed', () => this._detach())

		// Коллекция привязывается после install — ждём момент привязки
		ctx.get(TCollectionBundlesPlugin)?.events.on('engine:bound', (engine) => {
			this._engine = engine
		})
	}

	override destroy(): void {
		this._detach()

		this._owner = null
		this._engine = null
		this._elements = null

		super.destroy()
	}

	private _attach(node: Element): void {
		this._detach()

		const region: IDomEventTarget & Node = node

		// Не пассивный: колесо жеста гасится, иначе страница поехала бы вместе со стопкой
		region.addEventListener('wheel', this._onWheel, { passive: false })
		region.addEventListener('keydown', this._onKeyDown)

		this._region = region
	}

	private _detach(): void {
		this._region?.removeEventListener('wheel', this._onWheel)
		this._region?.removeEventListener('keydown', this._onKeyDown)

		this._region = null
		this._endGesture()
		this._cancelFrame()
	}

	/** Тосты стоят стопкой. */
	private get _cascade(): boolean {
		return this._owner?.layout === 'cascade'
	}

	private readonly _onWheel = (event: WheelEvent): void => {
		if (!this._cascade || event.ctrlKey || event.defaultPrevented) return

		const distance = wheelDistance(event)

		if (distance === 0 || this._open().length < 2) return

		event.preventDefault()

		const gesture = this._gesture ?? { distance: 0, stepped: false }

		this._gesture = gesture
		this._restartGesture()

		if (gesture.stepped) return

		gesture.distance += distance

		if (Math.abs(gesture.distance) < WHEEL_STEP) return

		gesture.stepped = true

		const focused = this._toastOf(this._region?.ownerDocument?.activeElement ?? null)
		const front = this._step(gesture.distance > 0 ? 1 : -1, focused)

		// Фокус был на тосте — он остаётся на переднем
		if (front && focused) this._focus(front)
	}

	private readonly _onKeyDown = (event: KeyboardEvent): void => {
		if (!this._cascade || event.defaultPrevented) return
		if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

		const step = arrowStep(event.key)

		if (step === null || takesArrows(event.target)) return

		const toast = this._toastOf(event.target)

		if (!toast) return

		const front = this._step(step, toast)

		if (!front) return

		event.preventDefault()

		this._focus(front)
	}

	/**
	 * Шаг стопки от тоста `reference` (под фокусом), а без него — от первого
	 * открытого. Новый порядок пишется перестановками одной пачкой: подписчики
	 * получают одно `change:items`. Отдаёт новый передний; листать нечего —
	 * `undefined`.
	 *
	 * Показанные — начало состава: предел видимых (`items:query:before`
	 * расширения `toasts`) берёт первые `max`, поэтому место тоста среди
	 * показанных и есть его индекс в коллекции.
	 */
	private _step(
		direction: TCascadeStep,
		reference: IToastsItem | undefined,
	): IToastsItem | undefined {
		const engine = this._engine
		const shown = engine?.extensions.batch.shown ?? []
		const open = shown.filter((toast) => toast.open)
		const front = reference && open.includes(reference) ? reference : open[0]

		if (!engine || !front || open.length < 2) return undefined

		// Как стопку видно: тост под фокусом впереди, остальные — за ним по порядку
		const stack = [front, ...open.filter((toast) => toast !== front)]
		const turned =
			direction === 1
				? [...stack.slice(1), front]
				: [...stack.slice(-1), ...stack.slice(0, -1)]
		const order = [...turned, ...shown.filter((toast) => !toast.open)]
		const { plain } = engine.extensions

		engine.batch(() => order.forEach((toast, index) => plain.move(toast, index)))

		return turned[0]
	}

	/** Фокус — переднему, и ещё раз, когда разметка переставлена. */
	private _focus(toast: IToastsItem): void {
		const node = this._elements?.getElementByItem(toast)

		if (!isFocusableElement(node)) return

		node.focus()

		this._cancelFrame()
		this._frame = requestAnimationFrame(() => {
			this._frame = null

			if (node.isConnected && node.ownerDocument.activeElement !== node) node.focus()
		})
	}

	/** Открытые показанные тосты — то, что листается. */
	private _open(): IToastsItem[] {
		return this._engine?.extensions.batch.shown.filter((toast) => toast.open) ?? []
	}

	/** Открытый показанный тост, чей узел содержит цель. */
	private _toastOf(target: EventTarget | null): IToastsItem | undefined {
		if (!(target instanceof Node)) return undefined

		return this._open().find((toast) =>
			this._elements?.getElementByItem(toast)?.contains(target),
		)
	}

	private _restartGesture(): void {
		if (this._gestureTimer !== null) clearTimeout(this._gestureTimer)

		this._gestureTimer = setTimeout(() => this._endGesture(), WHEEL_GESTURE_END)
	}

	private _endGesture(): void {
		if (this._gestureTimer !== null) clearTimeout(this._gestureTimer)

		this._gestureTimer = null
		this._gesture = null
	}

	private _cancelFrame(): void {
		if (this._frame === null) return

		cancelAnimationFrame(this._frame)
		this._frame = null
	}
}

/**
 * Прокрутка колесом по вертикали, px со знаком оси окна; `0` — колесо вбок
 * (поперёк стопки) или стоит. Строки и страницы (`deltaMode` не пиксели)
 * пикселей не знают: такой щелчок — сразу шаг.
 */
function wheelDistance(event: WheelEvent): number {
	if (event.deltaY === 0 || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return 0

	return event.deltaMode === 0 ? event.deltaY : Math.sign(event.deltaY) * WHEEL_STEP
}

/** Шаг стрелки: ↓ — передний назад, ↑ — задний вперёд; другая клавиша — `null`. */
function arrowStep(key: string): TCascadeStep | null {
	if (key === 'ArrowDown') return 1
	if (key === 'ArrowUp') return -1

	return null
}

/** Цель — поле, которому стрелки нужны самому. */
function takesArrows(target: EventTarget | null): boolean {
	return target instanceof Element && target.closest(TAKES_ARROWS) !== null
}
