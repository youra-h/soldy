import type { IExtension } from '../types'

/** События item-factory расширения (собственных событий нет). */
export type TFactoryEvents = Record<string, never>

/** Опции конструктора фабрики элементов. */
export interface IFactoryExtensionOptions<TItem extends object = any> {
	/** Конструктор элемента, в который оборачивается сырой источник. */
	itemCtor: new (source: Partial<TItem>) => TItem
}

/** Контракт расширения фабрики элементов. */
export interface IFactoryExtension<TItem extends object = any> extends IExtension<
	TItem,
	TFactoryEvents
> {
	/** Создать инстанс элемента из сырого источника. */
	create(source: Partial<TItem>): TItem

	/** Проверить, является ли значение сырым источником (а не инстансом элемента). */
	isSource(value: unknown): boolean
}
