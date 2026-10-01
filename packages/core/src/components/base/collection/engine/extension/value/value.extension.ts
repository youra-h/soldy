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
		// при монтировании, а проп приходит сразу
		ctx.driver.events.on('item:added', () => this._valueToSelection())
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
	 * не приехать, и повторный проход случится на `item:added`.
	 */
	private _valueToSelection(): void {
		const selection = this._selection
		const owner = this._ctx.options.get('owner')

		if (!selection || !owner || this._syncing) return

		const wanted = toKeys(owner.value)

		this._syncing = true

		try {
			selection.resetSelection()

			for (const key of wanted) {
				const item = this._ctx.driver.valueOf().find((candidate) => candidate.value === key)

				if (item) selection.select(item)
			}
		} finally {
			this._syncing = false
		}
	}
}

/** Значение к списку ключей. Пустая строка — это «не выбрано», а не ключ `''`. */
function toKeys(value: TSelectionValue): (string | number)[] {
	if (value === undefined || value === '') return []

	return Array.isArray(value) ? value : [value]
}
