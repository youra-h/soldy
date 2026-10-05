import { sameValue } from '../../../../../../common/utility/same-value'
import { TBaseExtension } from '../base-extension.class'
import type { IExtension, IExtensionContext } from '../types'
import type { TSelectionExtension } from '../selection'
import type {
	IValueSelectionOwner,
	IValuedItem,
	TSelectionValue,
	TValueSelectionExtensionEvents,
	TValueSelectionEngineOptions,
} from './types'

/**
 * TValueSelectionExtension — связь `value` владельца и выбора коллекции.
 *
 * Выбор и значение — не два состояния, а одно в двух видах: коллекция хранит
 * выбранные **элементы**, а наружу нужен ответ в **значениях**. Расширение
 * держит их согласованными в обе стороны.
 *
 * Живёт в движке, а не у конкретного компонента, потому что нужно всем, у кого
 * есть и список, и значение: ListBox, Select, Tags. Сначала это было написано
 * внутри `TSelectExtension` — единственного тогда списка со значением, — и
 * оставить копию у List значило бы завести две реализации одной мысли.
 *
 * Владелец — опция движка (`owner`): он приходит и уходит после сборки, и
 * расширение наблюдает его (`ctx.options.watch`). Без владельца выбор живёт
 * сам по себе, а пришедший владелец сверяется с ним так же, как на старте.
 *
 * **Зацикливание** снимается флагом, а не сравнением значений: сравнивать
 * пришлось бы массивы, и на `multiple` любая перестановка выглядела бы
 * изменением.
 */
export class TValueSelectionExtension<
	TOwner extends IValueSelectionOwner = IValueSelectionOwner,
	TItem extends IValuedItem = IValuedItem,
>
	extends TBaseExtension<
		TItem,
		TValueSelectionExtensionEvents,
		TValueSelectionEngineOptions<TOwner>
	>
	implements IExtension<TItem, TValueSelectionExtensionEvents>
{
	readonly name = 'value' as const

	private _syncing = false

	override install(ctx: IExtensionContext<TItem, TValueSelectionEngineOptions<TOwner>>): void {
		super.install(ctx)

		this._selection?.events.on('change:selection', () => this._selectionToValue())

		// Элемент мог приехать позже, чем выставили `value`: опции регистрируются
		// при монтировании, а проп приходит сразу. Сверка — раз на запись:
		// `change:items` приходит следом за `item:*` каждой команды и пачки, а
		// сверка на каждый `item:added` пачки проходила бы весь состав на
		// каждый добавленный элемент
		ctx.driver.events.on('change:items', () => this._valueToSelection())

		// Владелец пришёл — его `value` и выбор коллекции сводятся заново, а
		// подписка на смену `value` живёт, пока он владелец
		ctx.options.watch('owner', (owner, scope) => {
			if (!owner) return

			scope.on(owner.events, 'change:value', () => this._valueToSelection())

			this._reconcile(owner)
		})
	}

	/**
	 * Свести `value` владельца и выбор коллекции.
	 *
	 * Направление выбирается по тому, у кого есть что сказать: значение задано
	 * — главное оно, нет — выбор коллекции.
	 *
	 * Безусловное `value` → выбор затёрло бы выбор движка, собранного снаружи
	 * (`createEngine({ items: [{ _: { selected: true } }] })`) и переданного
	 * компоненту уже с выбором.
	 */
	private _reconcile(owner: TOwner): void {
		if (toKeys(owner.value).length > 0 || !this._selection?.selected.length) {
			this._valueToSelection()
		} else {
			this._selectionToValue()
		}
	}

	private get _selection(): TSelectionExtension<TItem> | undefined {
		return this._ctx?.extensions.selection as TSelectionExtension<TItem> | undefined
	}

	/** Выбор → `value`. */
	private _selectionToValue(): void {
		const selection = this._selection
		const owner = this._ctx.options.get('owner')

		if (!selection || !owner || this._syncing) return

		const selected = selection.selected

		this._syncing = true

		try {
			owner.value = selection.multiple
				? selected.map((item) => item.value as string | number)
				: (selected[0]?.value ?? undefined)
		} finally {
			this._syncing = false
		}
	}

	/**
	 * `value` → выбор.
	 *
	 * Значения без соответствующего элемента молча игнорируются: список мог ещё
	 * не приехать, и повторный проход случится на смене состава
	 * (`change:items`).
	 *
	 * Выбор, отменённый в `item:select:before`, значение не меняет: оно
	 * откатывается к тому, что выбрано на самом деле. В `single` выбор заменяет
	 * прежний сам, поэтому отменённый оставляет прежний; в `multiple` выбор
	 * собирается заново пачкой (`selectMany`) в порядке значения — одно
	 * `change:selection` на все ключи, — и отменённого в нём просто нет.
	 * В режиме `none` выбора нет вовсе — сводить нечего.
	 *
	 * Выбор `multiple`, уже собранный по значению тем же порядком, не
	 * пересобирается: сброс и пачка дали бы два `change:selection` без смены
	 * выбора. Так сверка на `change:items` молчит, когда выбор сложился в той
	 * же записи раньше неё — из отметок данных, — а `select` выбранного в
	 * `single` молчит и так.
	 */
	private _valueToSelection(): void {
		const selection = this._selection
		const owner = this._ctx.options.get('owner')

		if (!selection || !owner || this._syncing || selection.mode === 'none') return

		const items = this._itemsOf(toKeys(owner.value))

		let rejected = false

		this._syncing = true

		try {
			if (selection.multiple) {
				if (!sameValue(selection.selected, items)) {
					selection.resetSelection()
					selection.selectMany(items)
				}

				rejected = items.some((item) => !selection.isSelected(item))
			} else {
				if (items.length === 0) selection.resetSelection()

				for (const item of items) {
					if (!selection.select(item)) rejected = true
				}
			}
		} finally {
			this._syncing = false
		}

		if (rejected) this._selectionToValue()
	}

	/**
	 * Элементы ключей значения — по карте «значение → элемент», собранной за
	 * вызов одним проходом по составу: поиск на каждый ключ проходил бы его
	 * столько раз, сколько ключей. Значение у нескольких элементов — первый,
	 * как у `find`.
	 */
	private _itemsOf(keys: readonly (string | number)[]): TItem[] {
		if (keys.length === 0) return []

		const byValue = new Map<string | number | undefined, TItem>()

		for (const item of this._ctx.driver.valueOf()) {
			if (!byValue.has(item.value)) byValue.set(item.value, item)
		}

		return keys.map((key) => byValue.get(key)).filter((item) => item !== undefined)
	}
}

/** Значение к списку ключей. Пустая строка — это «не выбрано», а не ключ `''`. */
function toKeys(value: TSelectionValue): (string | number)[] {
	if (value === undefined || value === '') return []

	return Array.isArray(value) ? value : [value]
}
