import type { ICommand } from '../commands'
import type { ICollectionStorageDriver } from '../types'
import type { TEvented } from '@soldy/core'

export interface IExtensionContext<T> {
	readonly driver: ICollectionStorageDriver<T>
	readonly extensions: Record<string, IExtension<T>>
	execute(command: ICommand<T>): void
	batch(action: () => void): void
}

export interface IExtension<
	T,
	TEvents extends Record<string, (...args: any) => any> = Record<string, (...args: any) => any>,
> {
	/** Уникальное имя расширения (plain, batch, activation, order, selection). */
	readonly name: string

	/** События расширения. */
	readonly events: TEvented<TEvents>

	/**
	 * Вызывается движком при регистрации расширения.
	 * Здесь расширение подписывается на события driver и инициализирует состояние.
	 */
	install(ctx: IExtensionContext<T>): void
}

/**
 * Опции конструктора для расширений с item-адаптерами.
 */
export interface IBaseOwnerItemExtensionOptions<
	TItem extends object,
	TItemExt extends IItemExtension<TItem, any>,
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
 *
 * `TEvents` протаскивается наследниками до конца цепочки — иначе наследник,
 * добавивший своё событие, перестаёт подходить под контракт родителя. Причина
 * не в логике, а в дисперсии: в `TEvented<TEvents>` карта событий стоит и в
 * выходе (`event: keyof TEvents` в контексте middleware), и во входе
 * (`on(event, handler: TEvents[K])`), поэтому TypeScript считает параметр
 * инвариантным. Два эмиттера с разными картами несовместимы **в обе стороны**,
 * даже когда одна карта — надмножество другой.
 *
 * Отсюда правило для всей цепочки: **в констрейнтах пишем `<…, any>`, в
 * инстанцировании — точный набор.** Констрейнт — это граница «у тебя должен
 * быть эмиттер», а не «ровно такой эмиттер»; сверять карту там не нужно и
 * вредно, потому что инвариантность запрещает любое расхождение.
 */
export interface IItemExtension<
	// Параметр держит арность дженерика: аргумент передают на вызовах.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
	TItemExt extends IItemExtension<TItem, any> = IItemExtension<TItem>,
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
	TItemExt extends IItemExtension<TItem, any> = IItemExtension<TItem>,
> {
	/**
	 * Создать item-адаптер для указанного элемента.
	 * Вызывается для каждого элемента при его добавлении в коллекцию.
	 */
	createItem(owner: TItem): TItemExt
}
