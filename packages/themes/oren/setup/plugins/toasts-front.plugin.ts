import type { IToasts } from '@soldy-ui/core'
import { TBasePlugin, TElementPlugin } from '@soldy-ui/plugins'
import type { IPluginContext } from '@soldy-ui/plugins'

/** Высота переднего тоста стопки на регионе: по ней CSS держит высоту задних. */
const FRONT_HEIGHT = '--so-toasts-front-height'

/**
 * TToastsFrontPlugin — высота переднего тоста стопки для CSS темы.
 *
 * В стопке (`layout: 'cascade'`) задние тосты стоят за передним его высоты и
 * выглядывают из-под него на ступень (`components/toasts.css` общего слоя тем).
 * Свою высоту задний меняет переходом темы, когда передний сменился, а для
 * перехода нужно число: высоту переднего одной переменной CSS не знает — у
 * тостов описание, своё содержимое, перенос строк. Её и пишет плагин —
 * переменной `--so-toasts-front-height` на регионе, в px; без переменной
 * задний берёт высоту ячейки стопки, то есть ту же, но без перехода.
 *
 * Передний — тот же, что у CSS: тост под фокусом (`:focus-within`), а без
 * фокуса в стопке — первый, а за закрытым первым — следующий: закрытый
 * гаснет, и на его место уже встал он. Пока у региона есть узел и тосты
 * стоят стопкой, `ResizeObserver` следит за передним и пишет его высоту по
 * оси блока на каждую смену. Кто передний, плагин пересматривает, когда
 * меняется состав списка или закрывается тост (новый тост, перестановка,
 * уход, `data-open` — `MutationObserver` на списке) и когда фокус входит в
 * стопку или уходит из неё. Стопку сменили на столбец, узел сняли или плагин
 * уничтожен — наблюдение снято вместе с переменной.
 *
 * Плагин темы, а не библиотеки: переменную читает CSS темы — общий слой тем
 * (`@soldy-ui/theme-base`) ставит по ней высоту задних, oren ведёт её
 * переходом. Ставит его тема (`setup/plugins/install.ts`) на все Toasts.
 */
export class TToastsFrontPlugin extends TBasePlugin<IToasts> {
	private _owner: IToasts | null = null
	/** Корень региона, объявленный `TElementPlugin`; `null` — узла нет. */
	private _root: Element | null = null
	/** Регион, на котором записана высота; `null` — плагин за стопкой не следит. */
	private _region: HTMLElement | null = null
	/** Список тостов региона. */
	private _list: Element | null = null
	/** Передний тост, за которым следит наблюдатель. */
	private _front: Element | null = null
	private _resize: ResizeObserver | null = null
	private _mutation: MutationObserver | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<IToasts>()

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (node) => this._bind(node))
		element?.events.on('removed', () => this._bind(null))

		// Свой `ctrl` приложения переживает монтирование — подписка через базу:
		// её снимет `destroy()`
		this._listenTo(this._owner?.events, 'change:layout', this._sync)
	}

	override destroy(): void {
		this._bind(null)
		this._resize = null
		this._mutation = null
		this._owner = null

		super.destroy()
	}

	private _bind(root: Element | null): void {
		this._stop()
		this._root = root
		this._sync()
	}

	/** Следить за передним — пока у региона есть узел и тосты стоят стопкой. */
	private readonly _sync = (): void => {
		const on = Boolean(this._root && this._owner?.layout === 'cascade')

		if (on && !this._region) this._start()
		else if (!on && this._region) this._stop()
	}

	private _start(): void {
		const root = this._root
		const owner = this._owner

		// Переменная пишется в инлайновый стиль HTML-корня; узел другого рода
		// (`tag` свободен) плагин не трогает
		if (!(root instanceof HTMLElement) || !owner) return

		const list = root.querySelector(`:scope > .${owner.classes.resolve('__list')}`)

		if (!list) return

		this._region = root
		this._list = list
		this._resize ??= new ResizeObserver(this._onResize)
		this._mutation ??= new MutationObserver(this._pick)
		// Состав и порядок тостов — и закрытие первого: за ним передний — следующий
		this._mutation.observe(list, {
			childList: true,
			subtree: true,
			attributeFilter: ['data-open'],
		})

		root.addEventListener('focusin', this._pick)
		root.addEventListener('focusout', this._onFocusOut)

		this._pick()
	}

	private _stop(): void {
		this._resize?.disconnect()
		this._mutation?.disconnect()
		this._region?.removeEventListener('focusin', this._pick)
		this._region?.removeEventListener('focusout', this._onFocusOut)
		this._region?.style.removeProperty(FRONT_HEIGHT)

		this._region = null
		this._list = null
		this._front = null
	}

	/**
	 * Передний — тост под фокусом; без фокуса в стопке — первый, а за закрытым
	 * первым — следующий. Выбор тот же, что у темы (`$cascade-front`).
	 */
	private readonly _pick = (): void => {
		const items = [...(this._list?.children ?? [])]
		const [first, second] = items
		const closed = first instanceof HTMLElement && first.dataset.open === 'false'
		const front =
			items.find((item) => item.matches(':focus-within')) ??
			(closed ? second : undefined) ??
			first ??
			null

		if (front === this._front) return

		if (this._front) this._resize?.unobserve(this._front)

		this._front = front

		if (front) this._resize?.observe(front)
		else this._region?.style.removeProperty(FRONT_HEIGHT)
	}

	/**
	 * Фокус уходит: где он окажется, известно, когда смена фокуса закончилась.
	 * Пришёл он в другой тост стопки — переднего пересмотрит `focusin`, ушёл из
	 * стопки — передним снова станет первый.
	 */
	private readonly _onFocusOut = (): void => {
		queueMicrotask(this._pick)
	}

	/** Высота переднего по оси блока — та же ось, что у высоты задних в теме. */
	private readonly _onResize = (entries: ResizeObserverEntry[]): void => {
		for (const entry of entries) {
			const [size] = entry.borderBoxSize

			if (entry.target === this._front && size) {
				this._region?.style.setProperty(FRONT_HEIGHT, `${size.blockSize}px`)
			}
		}
	}
}
