import type { IExtension, IExtensionItems } from '../types'
import type { TEvented } from '@soldy/core'
import type { ISelectionItemExtension } from './item/types'

export type TSelectionMode = 'none' | 'single' | 'multiple'

export type TSelectionEvents<TItem> = {
	'change:selection': (items: TItem[]) => void
	'change:mode': (value: TSelectionMode) => void
}

/** Контракт расширения выборки. Реализуется TSelectionExtension. */
export interface ISelectionExtension<TItem extends object = any>
	extends IExtension<TItem>, IExtensionItems<TItem> {
	/** События расширения: change:selection, change:mode. */
	readonly events: TEvented<TSelectionEvents<TItem>>

	/** Режим выделения: none, single, multiple. */
	mode: TSelectionMode

	/** Удобный доступ: true если режим multiple. */
	readonly multiple: boolean

	/** Удобный доступ: true если режим single. */
	readonly single: boolean

	/** Количество выбранных элементов. */
	readonly selectedCount: number

	/** Выбрать элемент. В режиме single снимает выделение с предыдущего. */
	select(item: TItem): void

	/** Снять выделение с элемента. */
	deselect(item: TItem): void

	/** Переключить выделение элемента. */
	toggle(item: TItem): void

	/** Получить массив выбранных элементов. */
	getSelected(): TItem[]

	/** Проверить, выбран ли указанный элемент. */
	isSelected(item: TItem): boolean

	/** Полностью очистить выделение. */
	resetSelection(): void

	/** @inheritdoc IExtensionItems.createItem */
	createItem(owner: TItem): ISelectionItemExtension<TItem>
}
