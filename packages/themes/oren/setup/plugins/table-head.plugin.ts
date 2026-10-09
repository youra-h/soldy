import type { ITable } from '@soldy-ui/core'
import { TBasePlugin, TElementPlugin } from '@soldy-ui/plugins'
import type { IPluginContext } from '@soldy-ui/plugins'

/** Высота шапки на корне таблицы: по ней тема держит фокус в теле ниже шапки. */
const HEAD_HEIGHT = '--s-table-head-height'

/**
 * TTableHeadPlugin — высота закреплённой шапки Table для темы.
 *
 * Закреплённая шапка (`stickyHead`) стоит у верхнего края прокрутки, и
 * строки уходят под неё. Узел, на который браузер ведёт прокрутку к фокусу, —
 * ячейку сетки после ↑ и PageUp, поле в ячейке после Shift+Tab, — тема
 * держит ниже шапки отступом прокрутки (`scroll-margin-block-start`) на её
 * высоту. Высоту одной переменной CSS не знает: подписи заголовков
 * переносятся, в слоте заголовка бывает что угодно, и шапка бывает выше
 * строки шапки. Её и пишет плагин — переменной `--s-table-head-height` на
 * корне таблицы, в px; без переменной тема берёт высоту строки шапки.
 *
 * Пока у таблицы есть корень и шапка закреплена, `ResizeObserver` следит за
 * шапкой (`thead` — прямой ребёнок корня с классом части `__head`) и пишет её
 * высоту на каждую смену. Шапку открепили, узел сняли или плагин уничтожен —
 * наблюдение снято вместе с переменной. Переменная размера шапки не меняет —
 * её читает только отступ прокрутки в теле, — и петли у наблюдателя нет.
 *
 * Плагин темы, а не библиотеки: переменную читает только CSS oren. Ставит его
 * тема (`setup/plugins/install.ts`) на все Table.
 */
export class TTableHeadPlugin extends TBasePlugin<ITable> {
	private _owner: ITable | null = null
	/** Корень таблицы, объявленный `TElementPlugin`; `null` — узла нет. */
	private _root: Element | null = null
	/** Корень, на котором записана высота; `null` — плагин не следит за шапкой. */
	private _target: HTMLElement | null = null
	private _resize: ResizeObserver | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<ITable>()

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (node) => this._bind(node))
		element?.events.on('removed', () => this._bind(null))

		// Свой `ctrl` приложения переживает монтирование — подписка через базу:
		// её снимет `destroy()`
		this._listenTo(this._owner?.events, 'change:stickyHead', this._sync)
	}

	override destroy(): void {
		this._bind(null)
		this._resize = null
		this._owner = null

		super.destroy()
	}

	private _bind(root: Element | null): void {
		this._stop()
		this._root = root
		this._sync()
	}

	/** Следить за шапкой — пока у таблицы есть корень и шапка закреплена. */
	private readonly _sync = (): void => {
		const on = Boolean(this._root && this._owner?.stickyHead)

		if (on && !this._target) this._start()
		else if (!on && this._target) this._stop()
	}

	private _start(): void {
		const root = this._root
		const owner = this._owner

		// Переменная пишется в инлайновый стиль HTML-корня; узел другого рода
		// (`tag` свободен) плагин не трогает
		if (!(root instanceof HTMLElement) || !owner) return

		const head = root.querySelector(`:scope > .${owner.classes.resolve('__head')}`)

		if (!head) return

		this._target = root
		this._resize ??= new ResizeObserver(this._onResize)
		this._resize.observe(head)
	}

	private _stop(): void {
		this._resize?.disconnect()
		this._target?.style.removeProperty(HEAD_HEIGHT)
		this._target = null
	}

	/** Высота шапки по оси блока — та же ось, что у отступа прокрутки темы. */
	private readonly _onResize = (entries: ResizeObserverEntry[]): void => {
		const target = this._target

		for (const entry of entries) {
			const [size] = entry.borderBoxSize

			if (target && size) target.style.setProperty(HEAD_HEIGHT, `${size.blockSize}px`)
		}
	}
}
