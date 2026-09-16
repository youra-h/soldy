import type { IExtension } from '../types'

/**
 * Событий у расширения нет.
 *
 * Пустой объект, а не `Record<string, never>`: у второго есть индексная
 * сигнатура, и «событий нет» читается проверкой `relay` как «любое имя
 * подойдёт». Пустая карта не пропускает ни одного.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type TFactoryEvents = {}

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
