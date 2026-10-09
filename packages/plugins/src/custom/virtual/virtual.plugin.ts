import { drawOf } from '@soldy-ui/core'
import type { IDrawExtension, TDrawable } from '@soldy-ui/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { TElementPlugin } from '../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../collection'
import { scrollParentOf } from '../../utils'
import type { IDomEventTarget } from '../../utils'
import type { TVirtualPluginEvents } from './types'

/** Причина закрепления элемента в окне — в нём DOM-фокус. */
const FOCUS = 'focus'

/** Видимая полоса по вертикали — в координатах окна браузера. */
type TBand = { top: number; bottom: number }

/** Нарисованный элемент в документе: место среди показанных и его узел. */
type TDrawnNode = { place: number; node: Element }

/**
 * TVirtualPlugin — окно коллекции в документе: замер видимой полосы и шага
 * элементов и элемент с DOM-фокусом.
 *
 * Что рисовать, решает рисование коллекции (`draw`), — плагин отдаёт ему то,
 * что знает только живой документ: какая часть списка видна
 * (`notifyViewport`) и в каком элементе фокус (закрепление `focus`). Ставит
 * плагин в набор коллекции обёртка `Virtual`, когда коллекция подхватывает её
 * окно: движок к этому времени привязан к реестру bundles, узлы элементов
 * плагин берёт у реестра узлов. Пока окна нет, плагин не слушает ничего.
 *
 * **Что прокручивает окно.** Родитель нарисованных элементов, если
 * прокручивается сам (ListBox с `maxRows`, список в панели Select), иначе
 * ближайший предок, который прокручивается по вертикали, иначе страница.
 * Пропа нет: блок с ограниченной высотой и страница работают без настройки.
 * Контейнер ищется заново, когда меняется размер списка или контейнера, — с
 * ним меняется и то, прокручивается ли контейнер.
 *
 * **Замер — раз в кадр**, по прокрутке контейнера и страницы, по размеру
 * списка и контейнера и по смене того, что рисует коллекция. Полоса —
 * пересечение окна контейнера с окном браузера, от верха списка. Верх списка
 * — верх нарисованного элемента минус его место, умноженное на шаг: своей
 * разметки у списка может не быть вовсе (шапка и подвал ListBox, тело
 * таблицы), а элементы стоят от верха через шаг. Шаг — наименьшее расстояние
 * между верхами соседних нарисованных элементов: элемента ниже шага не
 * бывает, тема держит его высоту. Нарисован один — шаг прежний, а первым
 * замером — его высота; элементов в документе нет — замера нет.
 *
 * **Высокий элемент.** Высота элементов в окне одна на все: элемент выше
 * шага сдвинет распорки, и прокрутка поедет. Такой элемент плагин находит при
 * замере и предупреждает в консоли — один раз за монтирование.
 *
 * **Фокус.** Элемент, в который пришёл DOM-фокус, плагин закрепляет в окне:
 * прокрутка не уносит его из документа, пока фокус в нём. Фокус ушёл на узел
 * вне компонента — закрепления нет.
 */
export class TVirtualPlugin extends TBasePlugin<any, TVirtualPluginEvents> {
	private _root: Element | null = null
	private _draw: IDrawExtension<TDrawable> | null = null
	private _elements: TCollectionElements | null = null
	/** Родитель нарисованных элементов: за его размером плагин следит. */
	private _list: Element | null = null
	/** Контейнер прокрутки; `null` — прокручивает страница. */
	private _container: HTMLElement | null = null
	private _resize: ResizeObserver | null = null
	/** За чьим размером наблюдатель следит сейчас: список и контейнер. */
	private _observed = new Set<Element>()
	/**
	 * Размер сменился — контейнер искать заново при замере. Не в колбэке
	 * наблюдателя: новый узел под наблюдением дал бы в том же кадре ещё одно
	 * уведомление, и браузер сообщил бы о петле.
	 */
	private _containerStale = false
	private _frame: number | null = null
	private _listening = false
	/** Последний шаг элементов: пока замерить нечем, полосу меряют им. */
	private _step = 0
	/** О высоком элементе уже предупредили. */
	private _warned = false

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._elements = ctx.get(TCollectionElements) ?? null
		this._draw = drawOf<TDrawable>(ctx.get(TCollectionBundlesPlugin)?.engine) ?? null

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (node) => this._bind(node))
		element?.events.on('removed', () => this._bind(null))

		// Движок живёт дольше монтирования, поэтому подписка через базу: её
		// снимет `destroy()`
		this._listenTo(this._draw?.events, 'change:virtual', this._sync)
		this._listenTo(this._draw?.events, 'change:drawn', this._onSchedule)
	}

	override destroy(): void {
		this._bind(null)
		this._resize?.disconnect()
		this._resize = null
		this._observed.clear()
		this._draw = null
		this._elements = null

		super.destroy()
	}

	private _bind(root: Element | null): void {
		this._stop()
		this._root = root
		this._sync()
	}

	/** Слушать документ — пока у компонента есть корень и стоит окно. */
	private readonly _sync = (): void => {
		const on = Boolean(this._root && this._draw?.virtual)

		if (on && !this._listening) this._start()
		else if (!on && this._listening) this._stop()
	}

	private _start(): void {
		const root = this._root

		if (!root) return

		this._listening = true
		this._resize ??= new ResizeObserver(this._onResize)
		this._watchList(this._firstDrawn()?.node ?? null, true)

		const target: IDomEventTarget = root

		target.addEventListener('focusin', this._onFocusIn)
		target.addEventListener('focusout', this._onFocusOut)
		root.ownerDocument.defaultView?.addEventListener('scroll', this._onSchedule, {
			passive: true,
		})

		this._schedule()
	}

	private _stop(): void {
		const root = this._root

		this._cancel()

		if (!this._listening) return

		this._listening = false
		this._watchList(null, true)
		// Фокус в документе больше не отслеживается — и не держит элемент в окне
		this._draw?.pin(FOCUS, undefined)

		if (!root) return

		const target: IDomEventTarget = root

		target.removeEventListener('focusin', this._onFocusIn)
		target.removeEventListener('focusout', this._onFocusOut)
		root.ownerDocument.defaultView?.removeEventListener('scroll', this._onSchedule)
	}

	/**
	 * Узнать список по нарисованному элементу: за размером его родителя
	 * следить, а контейнер искать заново, если сменился родитель или просят.
	 */
	private _watchList(node: Element | null, findContainer: boolean): void {
		const list = node?.parentElement ?? null

		if (list !== this._list) {
			this._list = list
			this._observe()
			findContainer = true
		}

		if (findContainer) this._watchContainer(node ? scrollParentOf(node, 'y') : null)
	}

	/** Сменить контейнер прокрутки: прокрутку и размер слушать у нового. */
	private _watchContainer(container: HTMLElement | null): void {
		if (this._container === container) return

		const previous: IDomEventTarget | null = this._container

		previous?.removeEventListener('scroll', this._onSchedule)

		this._container = container

		const next: IDomEventTarget | null = container

		next?.addEventListener('scroll', this._onSchedule, { passive: true })

		this._observe()
	}

	/**
	 * Следить за размером списка и контейнера — пока слушаем документ. Узел,
	 * за которым уже следят, повторно не ставится: наблюдатель сообщил бы его
	 * размер заново.
	 */
	private _observe(): void {
		const resize = this._resize

		if (!resize) return

		const next = new Set<Element>()

		if (this._listening) {
			for (const node of [this._list, this._container]) if (node) next.add(node)
		}

		for (const node of this._observed) if (!next.has(node)) resize.unobserve(node)
		for (const node of next) if (!this._observed.has(node)) resize.observe(node)

		this._observed = next
	}

	/** Размер списка или контейнера сменился — может смениться и сам контейнер. */
	private readonly _onResize = (): void => {
		this._containerStale = true
		this._schedule()
	}

	private readonly _onSchedule = (): void => this._schedule()

	/** Проход — раз в кадр: подряд идущие поводы схлопываются в один замер. */
	private _schedule(): void {
		if (this._frame !== null || !this._listening) return

		this._frame = requestAnimationFrame(() => {
			this._frame = null
			this._measure()
		})
	}

	private _cancel(): void {
		if (this._frame === null) return

		cancelAnimationFrame(this._frame)
		this._frame = null
	}

	/* ------------------------------------------------------------------ */
	/* Замер                                                              */
	/* ------------------------------------------------------------------ */

	private _measure(): void {
		const draw = this._draw
		const band = this._band()

		if (!draw || !band) return

		const first = this._firstDrawn()

		this._watchList(first?.node ?? null, this._containerStale)
		this._containerStale = false

		const step = this._measureStep()

		if (step > 0) this._step = step

		if (!first) return

		const top = first.node.getBoundingClientRect().top - first.place * this._step

		draw.notifyViewport({ top: band.top - top, bottom: band.bottom - top, step: this._step })
	}

	/** Первый нарисованный элемент, у которого есть узел в документе. */
	private _firstDrawn(): TDrawnNode | null {
		for (const entry of this._draw?.drawn ?? []) {
			if (entry.kind !== 'item') continue

			const node = this._elements?.getElementByItem(entry.item)

			if (node) return { place: entry.place, node }
		}

		return null
	}

	/** Видимая полоса: окно контейнера в окне браузера, без контейнера — окно браузера. */
	private _band(): TBand | null {
		const view = this._root?.ownerDocument.defaultView

		if (!view) return null

		const page = { top: 0, bottom: view.innerHeight }
		const container = this._container

		if (!container) return page

		const rect = container.getBoundingClientRect()
		const top = rect.top + container.clientTop

		return {
			top: Math.max(top, page.top),
			bottom: Math.min(top + container.clientHeight, page.bottom),
		}
	}

	/**
	 * Шаг элементов — наименьшее расстояние между верхами соседних
	 * нарисованных элементов. Нарисован один — шаг прежний, а без прежнего —
	 * его высота; элементов нет — ноль. Элемент выше шага — предупреждение.
	 */
	private _measureStep(): number {
		const tops: Array<number | null> = []
		let height = 0

		for (const entry of this._draw?.drawn ?? []) {
			const node = entry.kind === 'item' ? this._elements?.getElementByItem(entry.item) : null
			const rect = node?.getBoundingClientRect()

			tops.push(rect ? rect.top : null)
			height = rect ? rect.height : height
		}

		const gaps: number[] = []

		for (let index = 1; index < tops.length; index++) {
			const [above, below] = [tops[index - 1], tops[index]]

			if (above !== null && below !== null && below > above) gaps.push(below - above)
		}

		if (gaps.length === 0) {
			const single = tops.filter((top) => top !== null).length === 1

			// У списка с промежутком между элементами высота элемента меньше шага:
			// одним элементом прежний шаг не перемеряют
			return single && this._step === 0 ? height : 0
		}

		const step = Math.min(...gaps)

		if (!this._warned && gaps.some((gap) => gap > step + 0.5)) {
			this._warned = true
			console.warn(
				'[soldy] Virtual: элемент выше остальных — в окне высота элементов должна быть ' +
					'одной на все, иначе прокрутка поедет. Держите содержимое элемента в одну строку.',
			)
		}

		return step
	}

	/* ------------------------------------------------------------------ */
	/* Фокус                                                              */
	/* ------------------------------------------------------------------ */

	/** Нарисованный элемент, в узле которого лежит узел. */
	private _itemOf(node: EventTarget | null): TDrawable | undefined {
		if (!(node instanceof Node)) return undefined

		for (const entry of this._draw?.drawn ?? []) {
			if (entry.kind !== 'item') continue
			if (this._elements?.getElementByItem(entry.item)?.contains(node)) return entry.item
		}

		return undefined
	}

	private readonly _onFocusIn = (event: FocusEvent): void => {
		this._draw?.pin(FOCUS, this._itemOf(event.target))
	}

	/** Фокус ушёл на узел вне компонента — закрепления нет. Ушёл из окна браузера — осталось. */
	private readonly _onFocusOut = (event: FocusEvent): void => {
		const next = event.relatedTarget

		if (next instanceof Node && !this._root?.contains(next)) {
			this._draw?.pin(FOCUS, undefined)
		}
	}
}
