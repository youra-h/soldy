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

/** У узла есть коробка: скрытый список (`display: none` у предка) её не даёт. */
function hasBox(node: Element): boolean {
	const rect = node.getBoundingClientRect()

	return rect.width > 0 || rect.height > 0
}

/**
 * TVirtualPlugin — the collection's window in the document: it measures the
 * visible band and the step of the items, and tracks the item with DOM focus.
 *
 * What to draw is decided by the collection's drawing (`draw`); the plugin
 * gives it what only the live document knows: which part of the list is
 * visible (`notifyViewport`) and which item holds focus (the `focus` pin). The
 * `Virtual` wrapper puts the plugin into the collection's bundle when the
 * collection picks up its window: by then the engine is bound to the bundles
 * registry, and the plugin takes item nodes from the registry of nodes. While
 * there is no window, the plugin listens to nothing.
 *
 * **What scrolls the window.** The parent of the drawn items if it scrolls
 * itself (ListBox with `maxRows`, the list in the Select panel), otherwise the
 * nearest ancestor that scrolls vertically, otherwise the page. There is no
 * prop: a block of limited height and the page work without setup. The
 * container is looked up again when the size of the list or the container
 * changes — with it changes whether the container scrolls.
 *
 * **One measurement a frame**, on scrolling of the container and the page, on
 * resizing of the list and the container, on a change of what the collection
 * draws, and when the first drawn item enters the document while none was in
 * it: the markup may draw the entries later than the window has them — the
 * Select panel builds its options from data on its first opening, and `drawn`
 * does not change then. The band is the intersection of the container's
 * window with the browser's, from the top of the list. The top of the list is
 * the top of a drawn item minus its place times the step: the list may have no
 * markup of its own at all (the header and footer of ListBox, the table
 * body), and the items stand from its top a step apart. The step is the
 * smallest distance between the tops of neighboring drawn items: no item is
 * shorter than the step, the theme holds its height. With one item drawn — the
 * previous step, and on the first measurement its height; no items in the
 * document — no measurement. No box at the drawn item (the list is hidden) —
 * no measurement either: from zero boxes the top of the list would slide to
 * the start, and while the list is hidden the window would follow it frame
 * after frame; this way it stays where it stood.
 *
 * **A tall item.** Items in the window share one height: an item taller than
 * the step shifts the fillers, and scrolling drifts. The plugin finds such an
 * item while measuring and warns in the console — once per mount.
 *
 * **Focus.** The item DOM focus came into is pinned in the window: scrolling
 * does not take it out of the document while focus is in it. Focus moved to a
 * node outside the component — no pin.
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
	/** Stops waiting for the first drawn node (`_awaitDrawn`); `null` — not waiting. */
	private _waiting: (() => void) | null = null
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

		const first = this._firstDrawn()

		this._watchList(first?.node ?? null, true)

		if (!first) this._awaitDrawn()

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
		this._waiting?.()
		this._waiting = null

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

		if (!first) {
			this._awaitDrawn()

			return
		}

		if (!hasBox(first.node)) return

		const step = this._measureStep()

		if (step > 0) this._step = step

		const top = first.node.getBoundingClientRect().top - first.place * this._step

		draw.notifyViewport({ top: band.top - top, bottom: band.bottom - top, step: this._step })
	}

	/**
	 * Wait for the first drawn item to enter the document — its bundle
	 * registered and its node bound, in either order
	 * (`TCollectionElements.waitFor`), — and measure a frame later. The markup
	 * may draw the window's entries later than the window has them: the panel of
	 * a Select builds its options from data on its first opening, and `drawn`
	 * does not change then. Without a node there is no list to watch the size
	 * of, and nothing would schedule the measurement.
	 */
	private _awaitDrawn(): void {
		if (this._waiting || !this._elements) return

		this._waiting = this._elements.waitFor(() => {
			if (!this._firstDrawn()) return false

			this._waiting = null
			this._schedule()

			return true
		})
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
