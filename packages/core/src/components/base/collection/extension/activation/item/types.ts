import type { IItemExtension } from '../../types'

/** События item-адаптера активации. */
export type TActivationItemEvents = {
	'change:active': () => void
}

/**
 * Контракт item-адаптера активации.
 * Предоставляет геттер/сеттер active — делегирует в родительский TActivationExtension.
 */
export interface IActivationItemExtension<TItem extends object = any> extends IItemExtension<
	TItem,
	TActivationItemEvents
> {
	/** Активен ли элемент. При установке вызывает activate/deactivate на родителе. */
	active: boolean
}
