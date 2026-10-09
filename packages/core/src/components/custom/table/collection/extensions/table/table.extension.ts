import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type {
	IBaseOwnerItemExtensionOptions,
	IExtensionContext,
} from '../../../../../base/collection'
import type { IStylable } from '../../../../../base/stylable'
import type { TChangeEvent } from '../../../../../../common'
import TCheckBox from '../../../../check-box/check-box.class'
import type { ICheckBox } from '../../../../check-box/types'
import type { ITableRow } from '../../../row/types'
import type { ITable } from '../../../types'
import { batchOf, selectionOf } from '../guards'
import { TTableItemExtension } from './item'
import type {
	ITableExtension,
	ITableItemExtension,
	TTableEngineOptions,
	TTableExtensionEvents,
	TTableShownSelection,
} from './types'

/** Чем таблица красит то, что рисует от её имени: строки и чекбоксы выбора. */
type TStyled = Partial<Pick<IStylable, 'size' | 'variant'>>

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
 *
 * **Колонка выбора** — пока выбор строк включён (`selecting`: режим не
 * `none`). Её чекбоксы — экземпляры, которые держит таблица: «выбрать все» в
 * шапке (`selectAll`) и по чекбоксу на строку (`acquireCheckBox`). Отметка чекбокса
 * — не своё состояние, а вид выбора: таблица пишет её от выбора, а запись
 * отметки в чекбокс — просьба пользователя (так её делает клик). Просьбу
 * таблица перехватывает до записи (`change:value:before`), гасит и выполняет
 * командой выбора: состояние чекбокса не расходится с выбором, даже когда
 * подписчик `item:select:before` выбор отменил, — тогда отметка просто
 * остаётся прежней. Своя отметка у чекбокса рядом с выбором была бы второй
 * копией одного факта, и после отменённого выбора они разошлись бы.
 *
 * Выключенность, размер и вариант чекбоксов таблица пишет тоже: от выбора и
 * строки, а не из разметки.
 *
 * **Чекбокс строки живёт, пока строка нарисована.** Его берёт item-адаптер
 * таблицы на монтирование строки (`acquireCheckBox`) и отпускает, когда
 * монтирование кончилось (`releaseCheckBox`): новое монтирование получает
 * новый чекбокс с текущим видом выбора. Держать чекбокс, пока строка в
 * коллекции, значило бы держать по чекбоксу на каждую строку, которую хоть раз
 * рисовали, — в режиме окна это все прокрученные строки — и писать вид выбора
 * всем им на каждый выбор. Монтирований одной строки бывает два сразу (React
 * собирает новое раньше, чем снимает прежнее), поэтому чекбокс один на строку
 * и считает, сколько монтирований его держит.
 */
export class TTableExtension<TOwner extends ITable = ITable, TRow extends ITableRow = ITableRow>
	extends TBaseOwnerItemExtension<
		TRow,
		ITableItemExtension<TRow>,
		TTableExtensionEvents,
		TTableEngineOptions<TOwner>
	>
	implements ITableExtension<TRow>
{
	readonly name = 'table' as const

	/** Последнее отданное `shownSelection`: событие — только на его смену. */
	private _shownSelection: TTableShownSelection = 'empty'

	/** Последнее отданное `selecting`: событие — только на его смену. */
	private _selecting = false

	/** Сколько действий над многими строками идёт: пересчёт — один, в конце внешнего. */
	private _grouping = 0

	/**
	 * Показанные строки, у которых слушается `disabled`: выключенная строка
	 * выпадает из счёта. Скрытые строки в счёт не входят, и их расширение не
	 * слушает.
	 */
	private readonly _watched = new Set<TRow>()

	private readonly _onDisabled = (): void => this._sync()

	/** Чекбокс «выбрать все показанные» — один на таблицу. */
	private readonly _selectAll: ICheckBox = new TCheckBox()

	/**
	 * Чекбоксы выбора нарисованных строк и сколько монтирований каждый держит.
	 * Заводятся, когда строку рисуют с колонкой выбора: у таблицы без выбора их
	 * нет вовсе.
	 */
	private readonly _checkBoxes = new Map<TRow, { checkBox: ICheckBox; holders: number }>()

	constructor(options?: IBaseOwnerItemExtensionOptions<TRow, ITableItemExtension<TRow>>) {
		super(TTableItemExtension, options)

		this._selectAll.events.on('change:value:before', (e) => this._chooseShown(e))
	}

	override install(ctx: IExtensionContext<TRow, TTableEngineOptions<TOwner>>): void {
		super.install(ctx)

		// Строке — свойства таблицы: пришедшей и поверх патча, который пишет ей
		// своё из данных
		ctx.driver.events.on('item:added', (e) => this._inheritOwner(e.item))
		ctx.driver.events.on('item:updated', (e) => this._inheritOwner(e.item))

		// Строка ушла из коллекции — её чекбокс больше не пишется, даже если
		// монтирование ещё не отпустило его. Удаление — всегда команда с
		// `item:removed`, в том числе очистка и сверка `patch`
		ctx.driver.events.on('item:removed', (e) => this._checkBoxes.delete(e.item))

		// Таблица — опция движка: приходит и уходит после сборки. Подписки на
		// неё живут в области наблюдателя — сменилась таблица, прежние сняты
		ctx.options.watch('owner', (owner, scope) => {
			if (!owner) return

			// Догон: строки и чекбоксы выбора, заведённые до прихода таблицы
			this._group(() => ctx.driver.valueOf().forEach((row) => this._inheritOwner(row)))
			this._restyleCheckBoxes(owner)

			// Смена у таблицы — всем строкам: `disabled` распространяется на
			// них, как у `<fieldset>`, `size` и `variant` диктует она
			scope.on(owner.events, 'change:disabled', (value: boolean) =>
				this._group(() =>
					ctx.driver.valueOf().forEach((row) => {
						row.disabled = value
					}),
				),
			)
			scope.on(owner.events, 'change:size', () => this._restyle(owner))
			scope.on(owner.events, 'change:variant', () => this._restyle(owner))
		})

		// Сколько показанных выбрано зависит от выбора, от показанных строк и от
		// того, можно ли строку выбрать. Показанные сменились — сменились и
		// строки, чей `disabled` слушать
		const selection = selectionOf(ctx)

		selection?.events.on('change:selection', () => this._sync())
		selection?.events.on('change:mode', () => this._syncSelecting())
		batchOf(ctx)?.events.on('change:shown', () => {
			this._watchShown()
			this._sync()
		})

		// Догон: движок могли наполнить и выбрать в нём до установки
		this._watchShown()
		this._selecting = this.selecting
		this._shownSelection = this.shownSelection
		this._syncSelectAll()
	}

	get shownSelection(): TTableShownSelection {
		const selection = selectionOf(this._ctx)
		const batch = batchOf(this._ctx)

		if (!selection || !batch) return 'empty'

		let selectable = 0
		let selected = 0

		for (const row of batch.shown) {
			if (row.disabled) continue

			selectable++

			if (selection.isSelected(row)) selected++
		}

		if (selectable === 0) return 'empty'

		if (selected === 0) return 'none'

		return selected === selectable ? 'all' : 'some'
	}

	get selecting(): boolean {
		const mode = selectionOf(this._ctx)?.mode

		return mode !== undefined && mode !== 'none'
	}

	get selectAll(): ICheckBox {
		return this._selectAll
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

	acquireCheckBox(row: TRow): ICheckBox {
		const held = this._checkBoxes.get(row)

		if (held) {
			held.holders++

			return held.checkBox
		}

		const checkBox: ICheckBox = new TCheckBox({
			value: this._isSelected(row),
			disabled: row.disabled,
			size: row.size,
			variant: row.variant,
		})

		checkBox.events.on('change:value:before', (e) => this._chooseRow(row, e))
		this._checkBoxes.set(row, { checkBox, holders: 1 })

		return checkBox
	}

	releaseCheckBox(row: TRow): void {
		const held = this._checkBoxes.get(row)

		if (!held) return

		held.holders--

		if (held.holders === 0) this._checkBoxes.delete(row)
	}

	/** Показанные строки, которые пользователь может выбрать, — не выключенные. */
	private _selectableShown(): TRow[] {
		return (batchOf(this._ctx)?.shown ?? []).filter((row) => !row.disabled)
	}

	private _isSelected(row: TRow): boolean {
		return selectionOf(this._ctx)?.isSelected(row) ?? false
	}

	/**
	 * Запись отметки в чекбокс шапки. Та же, что у выбора, — это таблица пишет
	 * вид, и запись проходит. Другая — просьба пользователя: гасится и
	 * выполняется командой над показанными строками. Чекбокс снова получает
	 * вид выбора — и когда команда ничего не сменила: снимая «часть», чекбокс
	 * сам гасит её раньше записи отметки.
	 */
	private _chooseShown(e: TChangeEvent<boolean | undefined>): void {
		const all = e.value === true

		if (all === (this._shownSelection === 'all')) return

		e.preventDefault()

		if (all) this.selectShown()
		else this.deselectShown()

		this._syncSelectAll()
	}

	/**
	 * Запись отметки в чекбокс строки. Та же, что у выбора, — это таблица пишет
	 * вид, и запись проходит. Другая — просьба пользователя: гасится и
	 * выполняется выбором строки. Выключенную строку пользователь не выбирает,
	 * а отменённый выбор отметку не меняет — она остаётся видом выбора.
	 */
	private _chooseRow(row: TRow, e: TChangeEvent<boolean | undefined>): void {
		const selection = selectionOf(this._ctx)
		const selected = e.value === true

		if (!selection || selected === selection.isSelected(row)) return

		e.preventDefault()

		if (row.disabled) return

		if (selected) selection.select(row)
		else selection.deselect(row)
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

	/** `size` и `variant` — всегда таблицы. */
	private _applyStyle(target: TStyled, owner: TOwner): void {
		target.size = owner.size
		target.variant = owner.variant
	}

	/** Размер или вариант таблицы сменились — строкам и чекбоксам выбора. */
	private _restyle(owner: TOwner): void {
		this._ctx.driver.valueOf().forEach((row) => this._applyStyle(row, owner))
		this._restyleCheckBoxes(owner)
	}

	/** Чекбоксам выбора — размер и вариант таблицы, как строкам. */
	private _restyleCheckBoxes(owner: TOwner): void {
		this._checkBoxes.forEach(({ checkBox }) => this._applyStyle(checkBox, owner))
		this._applyStyle(this._selectAll, owner)
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

	/**
	 * Пересчитать `shownSelection` и сообщить, если сменилось, и вид выбора в
	 * чекбоксах — им и без смены счёта: в `single` выбор переходит от строки к
	 * строке, а счёт остаётся «часть».
	 */
	private _sync(): void {
		if (this._grouping > 0) return

		const value = this.shownSelection
		const changed = value !== this._shownSelection

		this._shownSelection = value
		this._syncSelectAll()
		this._syncCheckBoxes()

		if (changed) this.events.emit('change:shownSelection', value)
	}

	/** Чекбокс шапки — вид `shownSelection`. */
	private _syncSelectAll(): void {
		const state = this._shownSelection

		this._selectAll.indeterminate = state === 'some'
		this._selectAll.value = state === 'all'
		this._selectAll.disabled = state === 'empty'
	}

	/**
	 * Чекбоксы строк — вид выбора и выключенности строк. Выключенность скрытой
	 * строки чекбокс узнаёт, когда строку покажут снова: скрытых таблица не
	 * слушает, а показ — тот же пересчёт.
	 */
	private _syncCheckBoxes(): void {
		for (const [row, { checkBox }] of this._checkBoxes) {
			checkBox.value = this._isSelected(row)
			checkBox.disabled = row.disabled
		}
	}

	/** Выбор строк включили или выключили — сообщить, если сменилось. */
	private _syncSelecting(): void {
		const value = this.selecting

		if (value === this._selecting) return

		this._selecting = value
		this.events.emit('change:selecting', value)
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
