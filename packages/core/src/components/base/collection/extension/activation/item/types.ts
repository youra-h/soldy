import type { IItemExtension } from '../../types'

/**
 * Контракт item-адаптера активации.
 * Предоставляет геттер/сеттер active — делегирует в родительский TActivationExtension.
 */
export interface IActivationItemExtension<TItem extends object = any>
	extends IItemExtension<TItem> {
	/** Активен ли элемент. При установке вызывает activate/deactivate на родителе. */
	active: boolean
}
