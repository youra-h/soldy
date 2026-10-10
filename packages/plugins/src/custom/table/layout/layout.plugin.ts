import type { ITable, TTableCollection } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin } from '../../collection'
import type { TTableLayoutPluginEvents } from './types'

/** Ребёнок узла с классом — только прямые дети: во вложенной таблице свои шапки. */
function childOf(node: Element, className: string): Element | null {
	return Array.from(node.children).find((child) => child.classList.contains(className)) ?? null
}

/**
 * TTableLayoutPlugin — место под колонки таблицы: ширина её окна без колонки
 * выбора.
 *
 * Ширины колонок раскладывает ядро — расширение колонок коллекции строк, по
 * месту и `columnFit` таблицы: фиксированная раскладка браузера не читает
 * `min-width` и `max-width` ячеек и не умеет делить место между колонками с
 * границами. Место — то, что знает только живой документ, и его мерит плагин
 * (`notifySpace`). Движок он узнаёт от реестра bundles (`engine:bound`).
 *
 * **Окно** — родитель корня с классом `__viewport` владельца: таблицу в нём
 * рисует разметка, и прокрутку окну включает тема по признаку «колонки шире
 * места». Окна нет — места нет, и ширины гибких колонок решает тема.
 *
 * **Замер — раз в кадр**, по размеру окна и корня: корень меняется от колонки
 * выбора и размера таблицы. Место — внутренняя ширина окна минус ячейка
 * колонки выбора в шапке, вниз до целого. Ширину окна наблюдатель отдаёт сам,
 * а пишет плагин только в кадре: высота окна зависит от таблицы, и запись
 * прямо в колбэке наблюдателя свернулась бы в его петлю.
 *
 * Корень сняли или плагин уничтожен — место неизвестно: движок, пришедший
 * снаружи, переживает таблицу, и прежнее место ему больше не верно.
 */
export class TTableLayoutPlugin extends TBasePlugin<ITable, TTableLayoutPluginEvents> {
	private _owner: ITable | null = null
	private _engine: TTableCollection | null = null
	private _root: Element | null = null
	private _viewport: Element | null = null
	private _observer: ResizeObserver | null = null
	private _frame: number | null = null
	/** Внутренняя ширина окна, px, — из последнего уведомления наблюдателя */
	private _inner = 0

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<ITable>() ?? null

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (node) => this._attach(node))
		element?.events.on('removed', () => this._detach())

		// Коллекция привязывается после install — ждём момент привязки
		ctx.get(TCollectionBundlesPlugin)?.events.on('engine:bound', (engine) => {
			this._engine = engine
			this._schedule()
		})
	}

	override destroy(): void {
		this._detach()
		this._observer = null
		this._owner = null
		this._engine = null

		super.destroy()
	}

	private _attach(root: Element): void {
		this._unobserve()

		this._root = root
		this._viewport = this._viewportOf(root)

		if (!this._viewport) return

		const observer = (this._observer ??= new ResizeObserver(this._onResize))

		observer.observe(this._viewport)
		observer.observe(root)
	}

	private _detach(): void {
		this._unobserve()
		this._root = null
		this._viewport = null
		this._engine?.extensions.columns.notifySpace(0)
	}

	private _unobserve(): void {
		this._observer?.disconnect()
		this._cancel()
		this._inner = 0
	}

	/** Окно — родитель корня с классом `__viewport` владельца. */
	private _viewportOf(root: Element): Element | null {
		const parent = root.parentElement
		const owner = this._owner

		if (!parent || !owner) return null

		return parent.classList.contains(owner.classes.resolve('__viewport')) ? parent : null
	}

	/** Ячейка колонки выбора в шапке своей таблицы — прямыми детьми. */
	private _selectOf(root: Element): Element | null {
		const owner = this._owner

		if (!owner) return null

		const head = childOf(root, owner.classes.resolve('__head'))
		const row = head && childOf(head, owner.classes.resolve('__head-row'))

		return row && childOf(row, owner.classes.resolve('__select'))
	}

	/** Ширину окна наблюдатель отдаёт сам; замер — в кадре. */
	private readonly _onResize = (entries: ResizeObserverEntry[]): void => {
		for (const entry of entries) {
			if (entry.target === this._viewport) this._inner = entry.contentRect.width
		}

		this._schedule()
	}

	/** Замер — раз в кадр: подряд идущие поводы схлопываются в один. */
	private _schedule(): void {
		if (this._frame !== null || !this._viewport) return

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
		const root = this._root
		const columns = this._engine?.extensions.columns

		if (!root || !columns) return

		const select = this._selectOf(root)
		const taken = select ? select.getBoundingClientRect().width : 0

		columns.notifySpace(Math.max(0, Math.floor(this._inner - taken)))
	}
}
