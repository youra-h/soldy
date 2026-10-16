import type { IPagination, TPaginationCollection } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import type { TPaginationArrow, TPaginationFocusPluginEvents } from './types'

/** Стрелки — по частям разметки владельца (`__prev`, `__next`). */
const ARROWS: readonly TPaginationArrow[] = ['prev', 'next']

/** Погасла ли стрелка — по геттеру пагинации, а не по атрибуту разметки. */
const ARROW_OFF: Readonly<Record<TPaginationArrow, (owner: IPagination) => boolean>> = {
	prev: (owner) => owner.prevDisabled,
	next: (owner) => owner.nextDisabled,
}

/**
 * TPaginationFocusPlugin — фокус со стрелки, погасшей под ним у края, — на
 * текущую страницу.
 *
 * Стрелки — нативные кнопки. Листая с клавиатуры до первой или последней
 * страницы, пользователь выключает стрелку, на которой стоит фокус, а
 * выключенная кнопка фокус теряет: браузер сбрасывает его в начало документа,
 * и пользователь клавиатуры и скринридера теряет место. Плагин переводит фокус
 * на кнопку текущей страницы — как календарь отдаёт его остановке сетки,
 * когда кнопка листания погасла у края, и как React Aria.
 *
 * **Синхронно, в том же событии.** Решает геттер (`prevDisabled`,
 * `nextDisabled`), а не атрибут: плагин слушает поводы, от которых зависит
 * выключенность стрелок, — `change:value`, `change:total`, `change:pageSize`,
 * `change:pages`, — и уводит фокус раньше, чем разметка выключит стрелку, так
 * что браузеру чинить уже нечего. `focusout`, наблюдатель за атрибутом и
 * ожидание перерисовки опоздали бы: к их моменту фокус уже в начале
 * документа. `change:disabled` плагин не слушает: у выключенной пагинации
 * остановок нет — фокус переносить некуда, — а включение стрелку не гасит.
 *
 * **Текущая — по ключу**: страница с ключом `value` пагинации среди страниц
 * коллекции, а не активная. Расширение `pagination` слушает того же
 * владельца и пересобирает окно и активацию, бывает, уже после плагина — тогда
 * активной была бы ещё прежняя страница. Ключ от порядка подписок не зависит:
 * стрелка гаснет, когда текущая — первая или последняя, а они в окне всегда,
 * так что страница уже в коллекции и её узел нарисован. Цена: плагин, который
 * слышит смену раньше расширения, не видит отмены перехода в
 * `item:activate:before` — значение вернулось к прежнему, стрелка снова
 * включена, а фокус остаётся на крайней странице, куда листали.
 *
 * Фокус остаётся, где был, когда переносить его некуда: пагинация выключена,
 * страницы значения нет в коллекции (ключ без страницы) или её узла нет в
 * документе — страница только вошла в окно (`middleCount` 0, а данные
 * сменились под фокусом). Узла страницы плагин не ждёт: стрелкой до края узел
 * текущей есть всегда.
 *
 * Стрелки находят по классам владельца (`classes.resolve`) и только внутри
 * его корня, страницу — по реестру узлов коллекции (`TCollectionElements`).
 * Кнопка страницы — первая `button` в её узле: корень страницы — место в
 * списке (`li`), а кнопкой является строка внутри.
 */
export class TPaginationFocusPlugin extends TBasePlugin<IPagination, TPaginationFocusPluginEvents> {
	private _owner: IPagination | null = null
	/** Корень пагинации: свои стрелки — только внутри него. */
	private _root: Element | null = null
	private _elements: TCollectionElements | null = null
	private _engine: TPaginationCollection | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<IPagination>() ?? null
		this._elements = ctx.get(TCollectionElements) ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => {
			this._root = element
		})
		elementPlugin?.events.on('removed', () => {
			this._root = null
		})

		// Коллекция привязывается после install — ждём момент привязки
		ctx.get(TCollectionBundlesPlugin)?.events.on(
			'engine:bound',
			(engine: TPaginationCollection) => {
				this._engine = engine
			},
		)

		// Поводы триггеров `prevDisabled` и `nextDisabled`, кроме `change:disabled`
		const events = this._owner?.events

		this._listenTo(events, 'change:value', this._onChange)
		this._listenTo(events, 'change:total', this._onChange)
		this._listenTo(events, 'change:pageSize', this._onChange)
		this._listenTo(events, 'change:pages', this._onChange)
	}

	override destroy(): void {
		this._owner = null
		this._root = null
		this._elements = null
		this._engine = null

		super.destroy()
	}

	/** Стрелка под фокусом погасла — фокус на кнопку текущей страницы. */
	private readonly _onChange = (): void => {
		const owner = this._owner
		const root = this._root

		// У выключенной пагинации выключены и страницы: остановок нет
		if (!owner || !root || owner.disabled) return

		const arrow = this._arrowUnderFocus(owner, root)

		if (arrow && ARROW_OFF[arrow](owner)) this._currentButton(owner)?.focus()
	}

	/** Стрелка своего корня, в которой стоит фокус; фокус не на стрелке — `undefined`. */
	private _arrowUnderFocus(owner: IPagination, root: Element): TPaginationArrow | undefined {
		const active = root.ownerDocument.activeElement

		if (!active) return undefined

		return ARROWS.find((arrow) => {
			const button = active.closest(owner.classes.resolve(`__${arrow}`, { point: true }))

			return button !== null && root.contains(button)
		})
	}

	/** Кнопка страницы с ключом значения, пока её узел в документе. */
	private _currentButton(owner: IPagination): HTMLButtonElement | null {
		const page = this._engine?.extensions.batch.items.find((item) => item.value === owner.value)
		const element = page ? this._elements?.getElementByItem(page) : null

		return element?.isConnected ? element.querySelector('button') : null
	}
}
