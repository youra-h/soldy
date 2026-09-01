import type { IItemExtension, TBaseItemEventsExtension } from '../../types'

/** События item-адаптера выборки. */
export type TSelectionItemEventsExtension = TBaseItemEventsExtension & {
	'change:selected': () => void
}

/**
 * Контракт item-адаптера выборки.
 * Предоставляет геттер/сеттер selected и метод toggle.
 */
export interface ISelectionItemExtension<TItem extends object = any>
	extends IItemExtension<TItem, TSelectionItemEventsExtension> {
	/** Выбран ли элемент. При установке вызывает select/deselect на родителе. */
	selected: boolean

	/** Переключить выбор элемента. */
	toggle(): void
}

/**
 * Item-level props элемента от selection-расширения. Зеркало SelectionItemExtensionContribution.
 * Выводится из контракта адаптера — поля совпадают, но опциональны.
 */
export type ISelectionCollectionItemProps = Partial<Pick<ISelectionItemExtension, 'selected'>>
