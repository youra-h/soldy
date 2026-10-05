import { TBaseExtension } from '../../../../../base/collection'
import type { IExtensionContext } from '../../../../../base/collection'
import type { ITableRow } from '../../../row/types'
import type { ITable } from '../../../types'
import { batchOf, selectionOf } from '../guards'
import type {
	ITableExtension,
	TTableEngineOptions,
	TTableExtensionEvents,
	TTableShownSelection,
} from './types'

/**
 * Таблица над коллекцией строк — то, что строки знают благодаря таблице.
 *
 * Таблица — опция движка (`owner`): она приходит и уходит после сборки, и
 * расширение наблюдает её (`ctx.options.watch`).
 *
 * **Свойства таблицы на строках.** `disabled` таблицы распространяется на
 * строки, как у `<fieldset>`: выключенная таблица выключает их, включённая —
 * включает. `size` и `variant` строке диктует таблица. Пишутся они в обычные
 * свойства строки — при добавлении, на смену у таблицы и поверх патча.
 *
 * **Выбор показанных** — для чекбокса шапки: сколько показанных строк выбрано
 * (`shownSelection`) и команды «выбрать все показанные» и «снять выбор с
 * показанных». Это выбор пользователя, поэтому выключенную строку они не
 * трогают — как выбор пользователя в списке. Выбрать или снять выключенную
 * строку из кода — право приложения: стандартный `selection`.
 *
 * Счёт «все / часть / ни одной» и правило «выключенную не трогать» в
 * стандартный `selection` не подняты: потребитель у них один — таблица. А
 * выбирают и снимают команды его пачкой (`selectMany`, `deselectMany`):
 * поштучный выбор слал бы `change:selection` на каждую строку, и каждый его
 * подписчик проходил бы все строки. Соседей — выбор и состав — расширение
 * узнаёт по контракту.
 */
export class TTableExtension<TOwner extends ITable = ITable, TRow extends ITableRow = ITableRow>
	extends TBaseExtension<TRow, TTableExtensionEvents, TTableEngineOptions<TOwner>>
	implements ITableExtension<TRow>
{
	readonly name = 'table' as const

	/** Последнее отданное `shownSelection`: событие — только на его смену. */
	private _shownSelection: TTableShownSelection = 'none'

	/** Сколько действий над многими строками идёт: пересчёт — один, в конце внешнего. */
	private _grouping = 0

	/**
	 * Показанные строки, у которых слушается `disabled`: выключенная строка
	 * выпадает из счёта. Скрытые строки в счёт не входят, и их расширение не
	 * слушает.
	 */
	private readonly _watched = new Set<TRow>()

	private readonly _onDisabled = (): void => this._sync()

	override install(ctx: IExtensionContext<TRow, TTableEngineOptions<TOwner>>): void {
		super.install(ctx)

		// Строке — свойства таблицы: пришедшей и поверх патча, который пишет ей
		// своё из данных
		ctx.driver.events.on('item:added', (e) => this._inheritOwner(e.item))
		ctx.driver.events.on('item:updated', (e) => this._inheritOwner(e.item))

		// Таблица — опция движка: приходит и уходит после сборки. Подписки на
		// неё живут в области наблюдателя — сменилась таблица, прежние сняты
		ctx.options.watch('owner', (owner, scope) => {
			if (!owner) return

			// Догон: строки, лежавшие до прихода таблицы
			this._group(() => ctx.driver.valueOf().forEach((row) => this._inheritOwner(row)))

			// Смена у таблицы — всем строкам: `disabled` распространяется на
			// них, как у `<fieldset>`, `size` и `variant` диктует она
			scope.on(owner.events, 'change:disabled', (value: boolean) =>
				this._group(() =>
					ctx.driver.valueOf().forEach((row) => {
						row.disabled = value
					}),
				),
			)
			scope.on(owner.events, 'change:size', () =>
				ctx.driver.valueOf().forEach((row) => this._applyStyle(row, owner)),
			)
			scope.on(owner.events, 'change:variant', () =>
				ctx.driver.valueOf().forEach((row) => this._applyStyle(row, owner)),
			)
		})

		// Сколько показанных выбрано зависит от выбора, от показанных строк и от
		// того, можно ли строку выбрать. Показанные сменились — сменились и
		// строки, чей `disabled` слушать
		selectionOf(ctx)?.events.on('change:selection', () => this._sync())
		batchOf(ctx)?.events.on('change:shown', () => {
			this._watchShown()
			this._sync()
		})

		// Догон: движок могли наполнить и выбрать в нём до установки
		this._watchShown()
		this._shownSelection = this.shownSelection
	}

	get shownSelection(): TTableShownSelection {
		const selection = selectionOf(this._ctx)
		const batch = batchOf(this._ctx)

		if (!selection || !batch) return 'none'

		let selectable = 0
		let selected = 0

		for (const row of batch.shown) {
			if (row.disabled) continue

			selectable++

			if (selection.isSelected(row)) selected++
		}

		if (selected === 0) return 'none'

		return selected === selectable ? 'all' : 'some'
	}

	/**
	 * Пачкой: одно `change:selection` на все строки, и `shownSelection`
	 * пересчитывается по нему один раз. Только в `multiple` — это правило
	 * `selectMany`.
	 */
	selectShown(): void {
		selectionOf(this._ctx)?.selectMany(this._selectableShown())
	}

	/** Пачкой, как `selectShown`. */
	deselectShown(): void {
		selectionOf(this._ctx)?.deselectMany(this._selectableShown())
	}

	/** Показанные строки, которые пользователь может выбрать, — не выключенные. */
	private _selectableShown(): TRow[] {
		return (batchOf(this._ctx)?.shown ?? []).filter((row) => !row.disabled)
	}

	/**
	 * Свойства таблицы на строке: `size` и `variant` — всегда её, `disabled` —
	 * когда таблица выключена. Таблицы нет — строка со своим.
	 *
	 * Строка или её источник: событие вставки несёт элемент типом источника, а
	 * пишутся только свойства, которые есть у обоих.
	 */
	private _inheritOwner(row: Partial<ITableRow>): void {
		const owner = this._ctx.options.get('owner')

		if (!owner) return

		this._applyStyle(row, owner)

		if (owner.disabled) row.disabled = true
	}

	/** `size` и `variant` строки — всегда таблицы. */
	private _applyStyle(row: Partial<ITableRow>, owner: TOwner): void {
		row.size = owner.size
		row.variant = owner.variant
	}

	/** Действие над многими строками: `shownSelection` пересчитывается один раз, в конце. */
	private _group(action: () => void): void {
		this._grouping++

		try {
			action()
		} finally {
			this._grouping--
			this._sync()
		}
	}

	/** Пересчитать `shownSelection` и сообщить, если сменилось. */
	private _sync(): void {
		if (this._grouping > 0) return

		const value = this.shownSelection

		if (value === this._shownSelection) return

		this._shownSelection = value
		this.events.emit('change:shownSelection', value)
	}

	/** Слушать `disabled` показанных строк, а ушедших из показанных — больше не слушать. */
	private _watchShown(): void {
		const shown = new Set(batchOf(this._ctx)?.shown)

		for (const row of this._watched) {
			if (shown.has(row)) continue

			row.events.off('change:disabled', this._onDisabled)
			this._watched.delete(row)
		}

		for (const row of shown) {
			if (this._watched.has(row)) continue

			row.events.on('change:disabled', this._onDisabled)
			this._watched.add(row)
		}
	}
}
