import type { IExtension } from '../types'

/** События item-factory расширения (собственных событий нет). */
export type TItemFactoryEvents = Record<string, never>

/** Контракт расширения фабрики элементов. */
export interface IItemFactoryExtension<TItem extends object = any>
	extends IExtension<TItem, TItemFactoryEvents> {
	/** Создать инстанс элемента из сырого источника. */
	create(source: any): TItem

	/** Проверить, является ли значение сырым источником (а не инстансом элемента). */
	isSource(value: unknown): boolean
}
