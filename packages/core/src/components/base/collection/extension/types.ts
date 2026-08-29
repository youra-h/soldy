import type { ICommand } from '../commands'
import type { ICollectionEngine } from '../types'
import type { TEvented } from '@soldy/core'

export interface IExtensionContext<T> {
	readonly engine: ICollectionEngine<T>
	readonly extensions: Record<string, IExtension<T>>
	execute(command: ICommand<T>): void
	batch(action: () => void): void
}

export interface IExtension<
	T,
	TEvents extends Record<string, (...args: any) => any> = Record<string, (...args: any) => any>,
	TOwnerProps extends object = Record<string, never>,
> {
	/** Уникальное имя расширения (plain, batch, activation, order, selection). */
	readonly name: string

	/** События расширения. */
	readonly events: TEvented<TEvents>

	/**
	 * Вызывается движком при регистрации расширения.
	 * Здесь расширение подписывается на события engine и инициализирует состояние.
	 */
	install(ctx: IExtensionContext<T>): void
}

/**
 * Опции конструктора для расширений с item-адаптерами.
 */
export interface IBaseOwnerItemExtensionOptions<
	TItem extends object,
	TItemExt extends IItemExtension<TItem>,
> {
	/** Пользовательский конструктор item-адаптера (если не указан — используется дефолтный). */
	itemCtor?: IItemExtensionCtor<TItem, any, TItemExt>
}

// --- Контракты для расширений с item-адаптерами ---

export type TBaseItemEventsExtension = {
	destroy: () => void
}

/**
 * Базовый контракт item-адаптера.
 * Конкретные адаптеры (активации, порядка, выборки) расширяют этот интерфейс.
 */
export interface IItemExtension<
	TItem extends object = any,
	TEvents extends Record<string, (...args: any) => any> = Record<string, (...args: any) => any>,
> {
	/** Собственные события item-адаптера (для реактивности в UI-слое). */
	readonly events: TEvented<TEvents>

	/** Очистить собственные события item-адаптера (отписки, middleware, входящие подписки). */
	destroy(): void
}

/**
 * Конструктор item-адаптера.
 *
 * @param owner — элемент коллекции, для которого создаётся адаптер
 * @param parent — родительское расширение, к которому привязан адаптер
 * @template TItem — тип элемента коллекции
 * @template TParent — тип родительского расширения
 * @template TItemExt — конкретный тип item-адаптера (возвращаемый)
 */
export interface IItemExtensionCtor<
	TItem extends object = any,
	TParent = any,
	TItemExt extends IItemExtension<TItem> = IItemExtension<TItem>,
> {
	new (owner: TItem, parent: TParent): TItemExt
}

/**
 * Примесь: расширение способно создавать item-адаптеры.
 * Не наследует IExtension — используется вместе с ним через множественное наследование.
 *
 * @template TItem — тип элемента коллекции
 * @template TItemExt — конкретный тип item-адаптера (IActivationItemExtension, IOrderItemExtension, ...)
 */
export interface IExtensionItems<
	TItem extends object = any,
	TItemExt extends IItemExtension<TItem> = IItemExtension<TItem>,
> {
	/**
	 * Создать item-адаптер для указанного элемента.
	 * Вызывается для каждого элемента при его добавлении в коллекцию.
	 */
	createItem(owner: TItem): TItemExt
}
