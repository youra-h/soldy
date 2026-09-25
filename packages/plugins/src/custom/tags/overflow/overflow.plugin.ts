import type { IPopover, ITags, ITagsItem, TTagsCollection } from '@soldy-ui/core'
import { TBasePlugin, TPluginBundle } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import { countFitting } from './fit'
import type { TTagsOverflowPluginEvents } from './types'

/**
 * TTagsOverflowPlugin — замер ряда тегов: сколько их помещается в строку.
 *
 * Плагин, а не расширение: это операция над DOM — ширина ряда, ширина каждого
 * тега и ширина кнопки «…». Результат уходит в коллекцию одним числом
 * (`TTagsOverflowExtension.notifyFit`), и делит состав уже она — тем же
 * приёмом, каким клавиатура сообщает тег под фокусом.
 *
 * Слушает, только пока `overflow === 'popover'`: в `wrap` и `scroll` ряд
 * справляется средствами темы, и мерить нечего. Режим выражен подпиской, а не
 * проверкой внутри обработчика.
 *
 * Наблюдение — один `ResizeObserver` на все узлы сразу (корень, теги, кнопка):
 * меняется от них одно и то же — итог замера, и отдельные наблюдатели давали
 * бы тот же проход по нескольку раз. Проход отложен на кадр: подряд идущие
 * уведомления схлопываются в один замер, и цикл «замерили → переложили →
 * замерили» не успевает свернуться в предупреждение браузера о
 * недоставленных уведомлениях.
 *
 * Ширины тегов плагин помнит по `uid`: тег, уехавший в панель, пока она
 * закрыта, имеет нулевой бокс — за измерение такой не считается, и в силе
 * остаётся прежнее значение. В `popover` тег не сжимается, поэтому ширина у
 * него одна и та же в ряду и в панели.
 */
export class TTagsOverflowPlugin extends TBasePlugin<ITags, TTagsOverflowPluginEvents> {
	/** Корень ряда: его ширину раскладка и даёт тегам. */
	private _root: Element | null = null
	/** Кнопка «…» вместе со своей обёрткой — корень поповера панели. */
	private _more: Element | null = null
	private _owner: ITags | null = null
	private _engine: TTagsCollection | null = null
	private _elements: TCollectionElements | null = null
	private _observer: ResizeObserver | null = null
	private _frame: number | null = null

	/** Натуральные ширины тегов по `uid` — последнее ненулевое измерение. */
	private readonly _widths = new Map<string | number, number>()

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<ITags>()
		this._elements = ctx.get(TCollectionElements) ?? null

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (node) => {
			this._root = node
			this._resync()
		})

		element?.events.on('removed', () => {
			this._root = null
			this._resync()
		})

		const bundles = ctx.get(TCollectionBundlesPlugin)

		// Коллекция привязывается после install — ждём момент привязки
		bundles?.events.on('engine:bound', (engine) => this._bindEngine(engine))

		// Узел тега появляется кадром позже своего bundle, а переезд тега из
		// ряда в панель — это новый bundle со своим узлом
		bundles?.events.on('bundle:registered', ({ bundle }) => {
			const node = bundle.get(TElementPlugin)

			node?.events.on('ready', this._onLayoutChange)
			node?.events.on('removed', this._onLayoutChange)

			this._resync()
		})

		bundles?.events.on('bundle:unregistered', this._onLayoutChange)

		this._listenTo(this._owner?.events, 'change:overflow', this._onLayoutChange)
	}

	override destroy(): void {
		this._observer?.disconnect()
		this._observer = null

		this._cancel()

		this._root = null
		this._more = null
		this._owner = null
		this._engine = null
		this._elements = null

		this._widths.clear()

		super.destroy()
	}

	private readonly _onLayoutChange = (): void => this._resync()

	/** Движок привязан: подписки на состав и панель держатся до `destroy()`. */
	private _bindEngine(engine: TTagsCollection): void {
		this._engine = engine

		this._listenTo(engine.extensions.batch.events, 'change:shown', this._onLayoutChange)
		this._listenTo(engine.extensions.overflow.events, 'change:panel', (panel) =>
			this._bindPanel(panel),
		)

		this._bindPanel(engine.extensions.overflow.panel)
		this._resync()
	}

	/**
	 * Узел кнопки «…» — корень поповера панели. Своего узла у чужого
	 * компонента плагину взять неоткуда, кроме как через его набор: инстанс
	 * панели объявляет набор событием `bundle:create` — той же шиной, что
	 * видит и разметка (AGENTS.md, «Две поверхности управления»).
	 */
	private _bindPanel(panel: IPopover | null): void {
		this._more = null

		this._listenTo(panel?.events, 'bundle:create', (bundle) => {
			if (!(bundle instanceof TPluginBundle)) return

			const node = bundle.get(TElementPlugin)

			node?.events.on('ready', (element) => {
				this._more = element
				this._resync()
			})

			node?.events.on('removed', () => {
				this._more = null
				this._resync()
			})
		})

		this._resync()
	}

	/** Наблюдаемые узлы: корень, теги и кнопка — пока режим `popover`. */
	private _resync(): void {
		this._observer?.disconnect()

		if (this._owner?.overflow !== 'popover') {
			this._cancel()

			return
		}

		const observer = (this._observer ??= new ResizeObserver(() => this._schedule()))

		if (this._root) observer.observe(this._root)
		if (this._more) observer.observe(this._more)

		for (const element of this._elements?.getAll() ?? []) observer.observe(element)

		this._schedule()
	}

	/** Замер — раз в кадр: подряд идущие поводы схлопываются в один проход. */
	private _schedule(): void {
		if (this._frame !== null) return

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

	private _measure(): void {
		const engine = this._engine
		const root = this._root

		if (!engine || !root || this._owner?.overflow !== 'popover') return

		const style = getComputedStyle(root)
		const shown = engine.extensions.batch.shown

		for (const item of shown) this._remember(item)

		engine.extensions.overflow.notifyFit(
			countFitting({
				available: root.getBoundingClientRect().width - this._inset(style),
				widths: shown.map((item) => this._widthOf(item)),
				gap: this._length(style.columnGap),
				more: this._width(this._more),
			}),
		)
	}

	/** Нулевой бокс за измерение не считается: так выглядит закрытая панель. */
	private _remember(item: ITagsItem): void {
		const width = this._width(this._elements?.getElementByUid(item.uid) ?? null)

		if (width !== undefined) this._widths.set(item.uid, width)
	}

	/**
	 * Ширина тега в ряду: скрытый места не занимает вовсе, у остальных — то,
	 * что намерили. Неизмеренный (`undefined`) остаётся в ряду, пока его не
	 * измерят.
	 */
	private _widthOf(item: ITagsItem): number | undefined {
		if (!item.visible || !item.rendered) return 0

		return this._widths.get(item.uid)
	}

	private _width(element: Element | null): number | undefined {
		const width = element?.getBoundingClientRect().width ?? 0

		return width > 0 ? width : undefined
	}

	/** Рамки и внутренние отступы ряда: тегам достаётся то, что внутри них. */
	private _inset(style: CSSStyleDeclaration): number {
		return (
			this._length(style.paddingLeft) +
			this._length(style.paddingRight) +
			this._length(style.borderLeftWidth) +
			this._length(style.borderRightWidth)
		)
	}

	/** Длина в пикселях; `normal` у зазора и пустая строка дают ноль. */
	private _length(value: string): number {
		const length = Number.parseFloat(value)

		return Number.isFinite(length) ? length : 0
	}
}
