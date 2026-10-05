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

	/**
	 * Выбор → `value`.
	 *
	 * Выбор говорит только за элементы, которые есть в коллекции. Ключ, чьего
	 * элемента в ней нет, в значении остаётся: список сменился (серверный поиск
	 * заменил `items`) или ещё не приехал, и вернувшийся элемент снова станет
	 * выбранным на сверке `change:items`. Поэтому удаление выбранного элемента
	 * значения не меняет, хотя выбор о нём объявляет, а выбор другого элемента
	 * не стирает ключ, которого в коллекции нет. Ключи остаются в своём
	 * порядке, новые выбранные встают в конец.
	 */
	private _selectionToValue(): void {
		const selection = this._selection
		const owner = this._ctx.options.get('owner')

		if (!selection || !owner || this._syncing) return

		const selected = selection.selected.map((item) => item.value as string | number)
		const stored = new Set(this._ctx.driver.valueOf().map((item) => item.value))
		const previous = toKeys(owner.value)

		this._syncing = true

		try {
			if (selection.multiple) {
				const chosen = new Set(selected)
				const kept = new Set(previous)

				owner.value = [
					...previous.filter((key) => chosen.has(key) || !stored.has(key)),
					...selected.filter((key) => !kept.has(key)),
				]
			} else {
				owner.value = selected[0] ?? previous.find((key) => !stored.has(key))
			}
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
	 * Выбор сводится одной заменой (`replaceSelection`), а не сбросом и
	 * добором: выбор, уже собранный по значению, замена не трогает и
	 * `change:selection` не шлёт — «то же самое» решает выбор, а не сверка.
	 *
	 * Выбор, отменённый в `item:select:before`, значение не меняет: оно
	 * откатывается к тому, что выбрано на самом деле. В `single` отменённый
	 * оставляет прежний; в `multiple` отменённого в выборе просто нет.
	 * В режиме `none` выбора нет вовсе — сводить нечего.
	 */
	private _valueToSelection(): void {
		const selection = this._selection
		const owner = this._ctx.options.get('owner')

		if (!selection || !owner || this._syncing || selection.mode === 'none') return

		const items = toKeys(owner.value)
			.map((key) => this._ctx.driver.valueOf().find((candidate) => candidate.value === key))
			.filter((item) => item !== undefined)

		this._syncing = true

		try {
			selection.replaceSelection(items)
		} finally {
			this._syncing = false
		}

		if (items.some((item) => !selection.isSelected(item))) this._selectionToValue()
	}
}

/** Значение к списку ключей. Пустая строка — это «не выбрано», а не ключ `''`. */
function toKeys(value: TSelectionValue): (string | number)[] {
	if (value === undefined || value === '') return []

	return Array.isArray(value) ? value : [value]
}
