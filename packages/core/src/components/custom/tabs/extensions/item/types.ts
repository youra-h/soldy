import type { IItemExtension } from '../../../../base/collection'

/**
 * Контракт item-адаптера таба.
 * Предоставляет геттер closable — резолвится из элемента ?? родительского расширения.
 */
export interface ITabItemExtension<TItem extends object = any>
	extends IItemExtension<TItem> {
	/** Может ли таб быть закрыт. */
	readonly closable: boolean

	/** Закрыть таб. Делегирует в родительское расширение. */
	close(): void
}
