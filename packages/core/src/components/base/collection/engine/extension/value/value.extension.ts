import { TBaseExtension } from '../base-extension.class'
import type { IExtension, IExtensionContext } from '../types'
import type { TSelectionExtension } from '../selection'
import type {
	IValueSelectionOwner,
	IValuedItem,
	TSelectionValue,
	TValueSelectionExtensionEvents,
	TValueSelectionExtensionOptions,
} from './types'

/**
 * TValueSelectionExtension — связь `value` владельца и выбора коллекции.
 *
 * Выбор и значение — не два состояния, а одно в двух видах: коллекция хранит
 * выбранные **элементы**, а наружу нужен ответ в **значениях**. Расширение
 * держит их согласованными в обе стороны.
 *
 * Живёт в движке, а не у конкретного компонента, потому что нужно всем, у кого
 * есть и список, и значение: List, ListBox, Select. Сначала это было написано
 * внутри `TSelectExtension` — единственного тогда списка со значением, — и
 * оставить копию у List значило бы завести две реализации одной мысли.
 *
 * **Зацикливание** снимается флагом, а не сравнением значений: сравнивать
 * пришлось бы массивы, и на `multiple` любая перестановка выглядела бы
 * изменением.
 */
export class TValueSelectionExtension<
	TOwner extends IValueSelectionOwner = IValueSelectionOwner,
	TItem extends IValuedItem = IValuedItem,
>
	extends TBaseExtension<TItem, TValueSelectionExtensionEvents>
	implements IExtension<TItem, TValueSelectionExtensionEvents>
{
	readonly name = 'value' as const

	protected readonly _owner: TOwner
	private _syncing = false

	constructor(options: TValueSelectionExtensionOptions<TOwner>) {
		super()
		this._owner = options.owner
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		this._selection?.events.on('change:selection', () => this._selectionToValue())
		this._owner.events.on('change:value', () => this._valueToSelection())

		// Элемент мог приехать позже, чем выставили `value`: опции регистрируются
		// при монтировании, а проп приходит сразу
		ctx.driver.events.on('item:added', () => this._valueToSelection())
		ctx.driver.events.on('change:items', () => this._valueToSelection())

		// Направление на старте выбирается по тому, у кого есть что сказать.
		//
		// Раньше здесь безусловно шло `value` → выбор: коллекция в этот момент
		// была пуста, и обратная сторона затёрла бы значение, заданное пропом.
		// Пустой она быть перестала — движок можно собрать снаружи
		// (`createEngine({ items: [{ _: { selected: true } }] })`) и передать
		// компоненту уже с выбором. Безусловный сброс молча его терял.
		if (this._hasValue() || !this._selection?.selected.length) {
			this._valueToSelection()
		} else {
			this._selectionToValue()
		}
	}

	/** Значение задано пропом — тогда главное оно, а не выбор коллекции. */
	private _hasValue(): boolean {
		return toKeys(this._owner.value).length > 0
	}

	private get _selection(): TSelectionExtension<TItem> | undefined {
		return this._ctx?.extensions.selection as TSelectionExtension<TItem> | undefined
	}

	/** Выбор → `value`. */
	private _selectionToValue(): void {
		const selection = this._selection

		if (!selection || this._syncing) return

		const selected = selection.selected

		this._syncing = true

		try {
			this._owner.value = selection.multiple
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

		if (!selection || !this._ctx || this._syncing) return

		const wanted = toKeys(this._owner.value)

		this._syncing = true

		try {
			selection.resetSelection()

			for (const key of wanted) {
				const item = this._ctx.driver.find((candidate) => candidate.value === key)

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
