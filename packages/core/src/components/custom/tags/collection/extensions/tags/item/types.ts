import type { IItemExtension, TBaseItemEventsExtension } from '../../../../../../base/collection'

export type TTagsItemEventsExtension = TBaseItemEventsExtension & {
	'change:closable': (value: boolean) => void
}

/**
 * Контракт item-адаптера тега.
 * Предоставляет геттер closable — резолвится из элемента ?? родительского расширения.
 */
export interface ITagsItemExtension<TItem extends object = any> extends IItemExtension<
	TItem,
	TTagsItemEventsExtension
> {
	/** Может ли тег быть закрыт. */
	readonly closable: boolean

	/** Закрыть тег. Делегирует в родительское расширение. */
	close(): void
}
