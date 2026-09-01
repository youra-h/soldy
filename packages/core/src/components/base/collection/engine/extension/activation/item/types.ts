import type { IItemExtension, TBaseItemEventsExtension } from '../../types'

/** События item-адаптера активации. */
export type TActivationItemEventsExtension = TBaseItemEventsExtension & {
	'change:active': () => void
}

/**
 * Контракт item-адаптера активации.
 * Предоставляет геттер/сеттер active — делегирует в родительский TActivationExtension.
 */
export interface IActivationItemExtension<TItem extends object = any> extends IItemExtension<
	TItem,
	TActivationItemEventsExtension
> {
	/** Активен ли элемент. При установке вызывает activate/deactivate на родителе. */
	active: boolean
}

/**
 * Item-level props элемента от activation-расширения. Зеркало ActivationItemExtensionContribution.
 * Выводится из контракта адаптера — поля совпадают, но опциональны.
 */
export type IActivationCollectionItemProps = Partial<Pick<IActivationItemExtension, 'active'>>
