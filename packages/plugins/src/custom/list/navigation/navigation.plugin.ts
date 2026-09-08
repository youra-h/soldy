import type { IListItem, TCollectionEngine } from '@soldy/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin } from '../../collection'
import { TListItemPlugin } from '../item'
import type { TListEdge, TListNavigationPluginEvents } from './types'

/**
 * TListNavigationPlugin — общая механика навигации по коллекции с клавиатуры.
 *
 * Здесь всё, что не зависит от роли элемента и модели фокуса: подписка на
 * `keydown`, привязка к движку коллекции, учёт подсвеченного элемента и
 * циклический сдвиг по индексу. Что делают конкретные клавиши и что означает
 * активация — дело наследника.
 *
 * Граница проведена именно так не из аккуратности. `ListBox` — самостоятельный
 * фокусируемый виджет с roving tabindex, `Select` — combobox, у которого фокус
 * не уходит с поля, а подсветка передаётся через `aria-activedescendant`. Роли
 * (`option` против `option` в другом контейнере), набор клавиш и смысл
 * активации у них разные, и попытка выразить это режимами одного плагина
 * заставила бы его тесты охранять два поведения сразу.
 *
 * Подсветка — не выбор. Она визуальна, живёт только во время навигации и в
 * значение не попадает; хранится в `TListItemPlugin` каждого элемента.
 */
export abstract class TListNavigationPlugin<
	TEvents extends TListNavigationPluginEvents = TListNavigationPluginEvents,
> extends TBasePlugin<any, TEvents> {
	protected _element: HTMLElement | null = null
	protected _bundles: TCollectionBundlesPlugin | null = null
	protected _collection: TCollectionEngine<any, any> | null = null
	protected _highlightedUid: string | number | null = null

	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		this._bundles = ctx.get(TCollectionBundlesPlugin) ?? null

		ctx.get(TElementPlugin)?.events.on('ready', (element) => {
			this._element = element
			element.addEventListener('keydown', this._onKeyDown)
		})

		ctx.get(TElementPlugin)?.events.on('removed', () => {
			this._element?.removeEventListener('keydown', this._onKeyDown)
			this._element = null
		})

		this._bundles?.events.on('engine:bound', (collection) => {
			this._collection = collection
			this.onCollectionBound(collection)
		})
	}

	override destroy(): void {
		this._element?.removeEventListener('keydown', this._onKeyDown)
		this.clearHighlight()

		this._element = null
		this._bundles = null
		this._collection = null

		super.destroy()
	}

	/** Элемент, на котором сейчас подсветка. */
	get highlightedUid(): string | number | null {
		return this._highlightedUid
	}

	/* ---------------------------------------------------------------- */
	/* Наследник обязан или может переопределить                          */
	/* ---------------------------------------------------------------- */

	/** Что делают клавиши. */
	protected abstract onKeyDown(event: KeyboardEvent): void

	/** Коллекция появилась — можно синхронизировать начальное состояние. */
	protected onCollectionBound(_collection: TCollectionEngine<any, any>): void {}

	/** Подсветка переехала. Здесь наследник обновляет ARIA, скроллит и т.п. */
	protected onHighlightChanged(_uid: string | number | null): void {}

	/**
	 * Элементы, по которым идёт навигация.
	 *
	 * По умолчанию все. Наследник сужает: у Select недоступные опции
	 * пропускаются — подсветить то, что нельзя выбрать, значит завести
	 * пользователя в тупик.
	 */
	protected items(): IListItem[] {
		return (this._collection?.driver ?? []) as IListItem[]
	}

	/* ---------------------------------------------------------------- */
	/* Общая механика                                                     */
	/* ---------------------------------------------------------------- */

	protected indexOf(uid: string | number | null): number {
		if (uid == null) return -1

		return this.items().findIndex((item) => item.uid === uid)
	}

	protected itemAt(index: number): IListItem | null {
		return this.items()[index] ?? null
	}

	protected itemByUid(uid: string | number): IListItem | null {
		return this.items().find((item) => item.uid === uid) ?? null
	}

	/**
	 * Сдвигает подсветку. Навигация зациклена: с последнего элемента `↓`
	 * уводит на первый — так принято в списках и так делают Ark и Radix.
	 */
	protected move(step: number): void {
		const items = this.items()

		if (items.length === 0) return

		const current = this.indexOf(this._highlightedUid)

		if (current === -1) {
			this.highlight(items[step > 0 ? 0 : items.length - 1].uid)

			return
		}

		const next = (current + step + items.length) % items.length

		this.highlight(items[next].uid)
	}

	protected highlightEdge(edge: TListEdge): void {
		const items = this.items()

		if (items.length === 0) return

		this.highlight(items[edge === 'first' ? 0 : items.length - 1].uid)
	}

	/** Перенести подсветку: позиция плюс визуальная отметка элемента. */
	protected highlight(uid: string | number): void {
		if (this._highlightedUid === uid) return

		this.trackHighlight(uid)

		const plugin = this.itemPlugin(uid)

		if (plugin) plugin.highlighted = true

		this.onHighlightChanged(uid)
	}

	/**
	 * Запомнить позицию, не отмечая элемент визуально.
	 *
	 * Нужно при синхронизации с выбором: список открылся на выбранном
	 * элементе, но подсветка навигации ещё не должна быть видна.
	 */
	protected trackHighlight(uid: string | number): void {
		if (this._highlightedUid === uid) return

		this.unmarkCurrent()

		this._highlightedUid = uid

		const index = this.indexOf(uid)

		this.emitHighlight(this.itemAt(index), this.itemAt(index - 1), this.itemAt(index + 1))
	}

	protected clearHighlight(): void {
		if (this._highlightedUid == null) return

		this.unmarkCurrent()

		this._highlightedUid = null

		this.emitHighlight(null, null, null)
		this.onHighlightChanged(null)
	}

	protected itemPlugin(uid: string | number): TListItemPlugin | undefined {
		return this._bundles?.getByUid(uid)?.get(TListItemPlugin)
	}

	/** Снимает визуальную отметку с текущего элемента. */
	private unmarkCurrent(): void {
		if (this._highlightedUid == null) return

		const plugin = this.itemPlugin(this._highlightedUid)

		if (plugin) plugin.highlighted = false
	}

	private emitHighlight(
		item: IListItem | null,
		prevItem: IListItem | null,
		nextItem: IListItem | null,
	): void {
		;(this.events as unknown as {
			emit(name: 'change:highlight', payload: unknown): void
		}).emit('change:highlight', { item, prevItem, nextItem })
	}

	private readonly _onKeyDown = (event: KeyboardEvent): void => {
		this.onKeyDown(event)
	}
}
