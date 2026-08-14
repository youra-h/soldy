import type { IItemExtension, TBaseItemEventsExtension } from '../../../../base/collection'

export type TTabItemEventsExtension = TBaseItemEventsExtension & {
	'change:closable': (value: boolean) => void
}

/**
 * Контракт item-адаптера таба.
 * Предоставляет геттер closable — резолвится из элемента ?? родительского расширения.
 */
export interface ITabItemExtension<TItem extends object = any> extends IItemExtension<
	TItem,
	TTabItemEventsExtension
> {
	/** Может ли таб быть закрыт. */
	readonly closable: boolean

	/** Закрыть таб. Делегирует в родительское расширение. */
	close(): void
}
