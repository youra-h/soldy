import { TActionEvent } from '../../../../../../common/event/action-event'
import type { IExtension, IExtensionItems } from '../types'
import type { ISelectionItemExtension } from './item/types'

/**
 * Событие перед выбором: подписчик `item:select:before` отменяет его
 * `preventDefault()` — элемент не становится выбранным, выбор остаётся прежним.
 */
export class TSelectEvent<TItem> extends TActionEvent {
	constructor(public readonly item: TItem) {
		super()
	}
}

export type TSelectionMode = 'none' | 'single' | 'multiple'

/**
 * Owner-level props коллекции от selection-расширения (input). Зеркало пропа `mode` в
 * дескрипторах коллекций с выбором (`ListBoxCollectionDescriptor` и соседи, setup).
 */
export interface ISelectionCollectionProps {
	/** Режим выделения. */
	mode?: TSelectionMode
}

export type TSelectionEvents<TItem> = {
	/** Элемент вот-вот станет выбранным; `preventDefault()` отменяет выбор */
	'item:select:before': (e: TSelectEvent<TItem>) => void
	'change:selection': (items: TItem[]) => void
	'change:mode': (value: TSelectionMode) => void
}

/** Контракт расширения выборки. Реализуется TSelectionExtension. */
export interface ISelectionExtension<TItem extends object = any>
	extends
		IExtension<TItem, TSelectionEvents<TItem>>,
		IExtensionItems<TItem, ISelectionItemExtension<TItem>> {
	/** Режим выделения: none, single, multiple. */
	mode: TSelectionMode

	/** Удобный доступ: true если режим multiple. */
	readonly multiple: boolean

	/** Удобный доступ: true если режим single. */
	readonly single: boolean

	/** Получить массив выбранных элементов. */
	readonly selected: TItem[]

	/** Количество выбранных элементов. */
	readonly selectedCount: number

	/**
	 * Выбрать элемент. В режиме single снимает выделение с предыдущего. Выбор
	 * отменяет подписчик `item:select:before`.
	 *
	 * @returns выбран ли элемент после вызова
	 */
	select(item: TItem): boolean

	/** Снять выделение с элемента. */
	deselect(item: TItem): void

	/**
	 * Выбрать элементы пачкой — только в режиме `multiple`. Выбор каждого
	 * отменяет подписчик `item:select:before`, отмена одного остальных не
	 * отменяет. `change:selection` — одно на пачку, и только если выбор сменился.
	 */
	selectMany(items: readonly TItem[]): void

	/**
	 * Снять выделение с элементов пачкой. `change:selection` — одно на пачку, и
	 * только если выбор сменился.
	 */
	deselectMany(items: readonly TItem[]): void

	/**
	 * Переключить выделение элемента.
	 *
	 * @returns выбран ли элемент после вызова
	 */
	toggle(item: TItem): boolean

	/** Проверить, выбран ли указанный элемент. */
	isSelected(item: TItem): boolean

	/** Полностью очистить выделение. */
	resetSelection(): void

	/** @inheritdoc IExtensionItems.createItem */
	createItem(owner: TItem): ISelectionItemExtension<TItem>
}
