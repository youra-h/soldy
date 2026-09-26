import type { IExtension } from '../types'
import type { TNoEvents } from '@soldy-ui/core'

/** Событий у расширения нет — см. `TNoEvents`. */
export type TFactoryEvents = TNoEvents

/** Опции, которые фабрика передаёт конструктору элемента вторым аргументом. */
export interface IFactoryItemOptions {
	/** Основа `id` элемента в DOM — `IComponentView.idBase`. */
	idBase?: string
}

/** Опции конструктора фабрики элементов. */
export interface IFactoryExtensionOptions<TItem extends object = any> {
	/** Конструктор элемента, в который оборачивается сырой источник. */
	itemCtor: new (source: Partial<TItem>, options?: IFactoryItemOptions) => TItem
}

/** Контракт расширения фабрики элементов. */
export interface IFactoryExtension<TItem extends object = any> extends IExtension<
	TItem,
	TFactoryEvents
> {
	/**
	 * Основа `id` элементов, которые фабрика создаёт из источников:
	 * `<idBase>-item-<номер>`, номер — по порядку создания. Задаёт её владелец
	 * коллекции своей основой; без неё основа элемента — его `uid`.
	 */
	bindIdBase(idBase: string): void

	/** Создать инстанс элемента из сырого источника. */
	create(source: Partial<TItem>): TItem

	/** Проверить, является ли значение сырым источником (а не инстансом элемента). */
	isSource(value: unknown): boolean
}
