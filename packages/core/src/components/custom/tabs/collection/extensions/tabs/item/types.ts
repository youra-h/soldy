import type { IItemExtension, TBaseItemEventsExtension } from '../../../../../../base/collection'

export type TTabsItemEventsExtension = TBaseItemEventsExtension & {
	'change:closable': (value: boolean) => void
}

/**
 * Контракт item-адаптера таба.
 * Предоставляет геттер closable — резолвится из элемента ?? родительского расширения.
 */
export interface ITabsItemExtension<TItem extends object = any> extends IItemExtension<
	TItem,
	TTabsItemEventsExtension
> {
	/** Может ли таб быть закрыт. */
	readonly closable: boolean

	/** Закрыть таб. Делегирует в родительское расширение. */
	close(): void
}
