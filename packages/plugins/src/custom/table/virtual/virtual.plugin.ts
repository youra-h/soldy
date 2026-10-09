import type { ITable, ITableRow, TTableCollection } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import { scrollParentOf } from '../../../utils'
import type { IDomEventTarget } from '../../../utils'
import type { TTableVirtualPluginEvents } from './types'

/** Ребёнок узла с классом — только прямые дети: во вложенной таблице свои части. */
function childOf(node: Element | null, className: string): Element | null {
	if (!node) return null

	return Array.from(node.children).find((child) => child.classList.contains(className)) ?? null
}

/** Видимая полоса по вертикали — в координатах окна браузера. */
type TBand = { top: number; bottom: number }

/**
 * TTableVirtualPlugin — окно таблицы в документе: замер видимой полосы тела и
 * шага строк и строка с DOM-фокусом.
 *
 * Что рисовать, решает расширение `virtual` коллекции строк, — плагин
 * отдаёт ему то, что знает только живой документ: какая часть тела видна
 * (`notifyViewport`) и в какой строке фокус (`notifyFocus`). Движок плагин
 * узнаёт от реестра bundles, узлы строк — от реестра узлов. Без режима окна
 * плагин не слушает ничего.
 *
 * **Что прокручивает окно.** Ближайший предок, который прокручивается по
 * вертикали (`overflow-y` `auto` или `scroll`, и содержимое выше окна), иначе
 * страница. Пропа нет: блок с ограниченной высотой и страница работают без
 * настройки. Предок ищется заново, когда меняется размер таблицы, — с ним
 * меняется и то, прокручивается ли контейнер.
 *
 * **Замер — раз в кадр**, по прокрутке контейнера и страницы, по размеру
 * таблицы и контейнера и по смене того, что рисует тело. Полоса — пересечение
 * окна контейнера с окном браузера, от верха тела: распорка перед окном стоит
 * в теле первой, и верх тела — верх первой строки. Шаг — наименьшее
 * расстояние между верхами соседних нарисованных строк: строки ниже шага не
 * бывает, тема держит её высоту. Строк в документе нет — шаг прежний.
 *
 * **Высокая строка.** Высота строк в режиме окна одна на все: строка выше
 * шага сдвинет распорки, и прокрутка поедет. Такую строку плагин находит при
 * замере и предупреждает в консоли — один раз за монтирование.
 *
 * **Фокус.** Строку, в которую пришёл DOM-фокус, плагин сообщает окну:
 * прокрутка не уносит её из документа, пока фокус в ней. Фокус ушёл на узел
 * вне таблицы — строки с фокусом нет.
 */
export class TTableVirtualPlugin extends TBasePlugin<ITable, TTableVirtualPluginEvents> {
	private _owner: ITable | null = null
	private _root: Element | null = null
	private _engine: TTableCollection | null = null
	private _elements: TCollectionElements | null = null
	/** Контейнер прокрутки; `null` — прокручивает страница. */
	private _container: HTMLElement | null = null
	private _resize: ResizeObserver | null = null
	private _frame: number | null = null
	private _listening = false
	/** Последний шаг строк: пока строк в документе нет, полосу меряют им. */
	private _step = 0
	/** О высокой строке уже предупредили. */
	private _warned = false

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<ITable>() ?? null
		this._elements = ctx.get(TCollectionElements) ?? null

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (node) => this._bind(node))
		element?.events.on('removed', () => this._bind(null))

		// Коллекция привязывается после install — ждём момент привязки. Движок
		// живёт дольше монтирования, поэтому подписка через базу: её снимет
		// `destroy()`
		ctx.get(TCollectionBundlesPlugin)?.events.on('engine:bound', (engine) => {
			this._engine = engine
			this._listenTo(engine.extensions.virtual.events, 'change:virtual', this._sync)
			this._listenTo(engine.extensions.virtual.events, 'change:bodyRows', this._onSchedule)
			this._sync()
		})
	}

	override destroy(): void {
		this._bind(null)
		this._resize?.disconnect()
		this._resize = null
		this._owner = null
		this._engine = null
		this._elements = null

		super.destroy()
	}

	private _bind(root: Element | null): void {
		this._stop()
		this._root = root
		this._sync()
	}

	/** Слушать документ — пока у таблицы есть корень и включён режим окна. */
	private readonly _sync = (): void => {
		const on = Boolean(this._root && this._engine?.extensions.virtual.virtual)

		if (on && !this._listening) this._start()
		else if (!on && this._listening) this._stop()
	}

	private _start(): void {
		const root = this._root

		if (!root) return

		this._listening = true
		this._resize ??= new ResizeObserver(this._onResize)
		this._resize.observe(root)
		this._watchContainer(scrollParentOf(root, 'y'))

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
		this._watchContainer(null)
		this._resize?.disconnect()

		if (!root) return

		const target: IDomEventTarget = root

		target.removeEventListener('focusin', this._onFocusIn)
		target.removeEventListener('focusout', this._onFocusOut)
		root.ownerDocument.defaultView?.removeEventListener('scroll', this._onSchedule)
	}

	/** Сменить контейнер прокрутки: прокрутку и размер слушать у нового. */
	private _watchContainer(container: HTMLElement | null): void {
		if (this._container === container) return

		const previous: IDomEventTarget | null = this._container

		previous?.removeEventListener('scroll', this._onSchedule)

		if (this._container) this._resize?.unobserve(this._container)

		this._container = container

		const next: IDomEventTarget | null = container

		next?.addEventListener('scroll', this._onSchedule, { passive: true })

		if (container) this._resize?.observe(container)
	}

	/** Размер таблицы или контейнера сменился — может смениться и сам контейнер. */
	private readonly _onResize = (): void => {
		if (this._root) this._watchContainer(scrollParentOf(this._root, 'y'))

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
		const virtual = this._engine?.extensions.virtual
		const body = this._body()
		const band = this._band()

		if (!virtual || !body || !band) return

		const step = this._measureStep()

		if (step > 0) this._step = step

		const top = body.getBoundingClientRect().top

		virtual.notifyViewport({ top: band.top - top, bottom: band.bottom - top, step: this._step })
	}

	private _body(): Element | null {
		const owner = this._owner

		return owner ? childOf(this._root, owner.classes.resolve('__body')) : null
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
	 * Шаг строк — наименьшее расстояние между верхами соседних нарисованных
	 * строк; строка одна — её высота; строк нет — ноль. Строка выше шага —
	 * предупреждение.
	 */
	private _measureStep(): number {
		const tops: Array<number | null> = []
		let height = 0

		for (const entry of this._engine?.extensions.virtual.bodyRows ?? []) {
			const element =
				entry.kind === 'row' ? this._elements?.getElementByItem(entry.row) : null
			const rect = element?.getBoundingClientRect()

			tops.push(rect ? rect.top : null)
			height = rect ? rect.height : height
		}

		const gaps: number[] = []

		for (let index = 1; index < tops.length; index++) {
			const [above, below] = [tops[index - 1], tops[index]]

			if (above !== null && below !== null && below > above) gaps.push(below - above)
		}

		if (gaps.length === 0) return tops.filter((top) => top !== null).length === 1 ? height : 0

		const step = Math.min(...gaps)

		if (!this._warned && gaps.some((gap) => gap > step + 0.5)) {
			this._warned = true
			console.warn(
				'[soldy] Table: в режиме окна (`virtual`) строка выше остальных — высота строк ' +
					'должна быть одной на все, иначе прокрутка поедет. Держите содержимое ячейки в одну строку.',
			)
		}

		return step
	}

	/* ------------------------------------------------------------------ */
	/* Фокус                                                              */
	/* ------------------------------------------------------------------ */

	/** Нарисованная строка, в которой лежит узел. */
	private _rowOf(node: EventTarget | null): ITableRow | undefined {
		if (!(node instanceof Node)) return undefined

		for (const entry of this._engine?.extensions.virtual.bodyRows ?? []) {
			if (entry.kind !== 'row') continue
			if (this._elements?.getElementByItem(entry.row)?.contains(node)) return entry.row
		}

		return undefined
	}

	private readonly _onFocusIn = (event: FocusEvent): void => {
		this._engine?.extensions.virtual.notifyFocus(this._rowOf(event.target))
	}

	/** Фокус ушёл на узел вне таблицы — строки с фокусом нет. Ушёл из окна браузера — остался. */
	private readonly _onFocusOut = (event: FocusEvent): void => {
		const next = event.relatedTarget

		if (next instanceof Node && !this._root?.contains(next)) {
			this._engine?.extensions.virtual.notifyFocus(undefined)
		}
	}
}
