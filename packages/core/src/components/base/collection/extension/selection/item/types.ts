import type { IItemExtension } from '../../types'

/** События item-адаптера выборки. */
export type TSelectionItemEvents = {
	'change:selected': () => void
}

/**
 * Контракт item-адаптера выборки.
 * Предоставляет геттер/сеттер selected и метод toggle.
 */
export interface ISelectionItemExtension<TItem extends object = any>
	extends IItemExtension<TItem, TSelectionItemEvents> {
	/** Выбран ли элемент. При установке вызывает select/deselect на родителе. */
	selected: boolean

	/** Переключить выбор элемента. */
	toggle(): void
}
