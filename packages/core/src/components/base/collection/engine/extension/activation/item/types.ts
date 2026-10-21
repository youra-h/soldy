import type { IItemExtension, TBaseItemEventsExtension } from '../../types'

/** События item-адаптера активации. */
export type TActivationItemEventsExtension = TBaseItemEventsExtension & {
	/**
	 * Активность этого элемента сменилась; `value` — новая, то же, что отдаёт
	 * геттер `active`. Приходит только новому активному и прежнему, а не всем
	 * на любую смену активного.
	 */
	'change:active': (value: boolean) => void
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
 * Item-level props элемента от activation-расширения. Зеркало пропа `active` в
 * `TabsCollectionItemDescriptor` и `RadioGroupCollectionItemDescriptor` (setup).
 * Выводится из контракта адаптера — поля совпадают, но опциональны.
 */
export type IActivationCollectionItemProps = Partial<Pick<IActivationItemExtension, 'active'>>
