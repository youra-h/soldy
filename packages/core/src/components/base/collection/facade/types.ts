import type { IComponentOptions } from '../../component'
import type {
	TCollectionEngine,
	IExtension,
	TCollectionEngineItemSource,
} from '../engine'

/**
 * Опции конструктора фасада владельца коллекции.
 *
 * Расширяет `IComponentOptions` (states) и добавляет управляющий объект `engine`
 * — готовую коллекцию (аналог `ctrl` для обычных компонентов).
 */
export interface ICollectionComponentOptions<
	TItem extends object,
	TExtensions extends Record<string, IExtension<TItem>>,
> extends IComponentOptions {
	/** Управляющий объект — готовая коллекция (аналог `ctrl` для обычных компонентов). */
	engine: TCollectionEngine<TItem, TExtensions>
}

/**
 * Входные props владельца коллекции, принимаемые фасадом.
 * Пока общие для всех коллекций (items + trackBy); специфичные выносятся отдельно.
 */
export type TCollectionFacadeProps<TItem = any, TItemProps = any> = {
	items?: (TCollectionEngineItemSource<TItemProps> | TItem)[]
	trackBy?: (item: TItem) => any
}

/**
 * Опции конструктора фасада владельца коллекции:
 * либо готовая коллекция `engine`, либо `owner` для её создания.
 */
export type TCollectionFacadeOptions<TCollection = unknown, TOwner = unknown> = {
	engine?: TCollection
	owner?: TOwner
}
