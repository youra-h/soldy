import type { ICommand } from '../command'
import type { TCollection } from '../collection.class'
import type { ICollectionEngine } from '../types'

export interface IExtensionContext<T> {
	readonly engine: ICollectionEngine<T>
	readonly collection: TCollection<T, any>
	execute(command: ICommand<T>): void
	batch(action: () => void): void
}

export interface IExtension<T> {
	/** Уникальное имя расширения (plain, batch, activation, order, selection). */
	readonly name: string

	/**
	 * Вызывается движком при регистрации расширения.
	 * Здесь расширение подписывается на события engine и инициализирует состояние.
	 */
	install(ctx: IExtensionContext<T>): void
}

// --- Контракты для расширений с item-адаптерами ---

/**
 * Базовый контракт item-адаптера.
 * Конкретные адаптеры (активации, порядка, выборки) расширяют этот интерфейс.
 */
export interface IItemExtension<TItem extends object = any> {}

/**
 * Конструктор item-адаптера.
 *
 * @param owner — элемент коллекции, для которого создаётся адаптер
 * @param parent — родительское расширение, к которому привязан адаптер
 */
export interface IItemExtensionCtor<TItem extends object = any, TParent = any> {
	new (owner: TItem, parent: TParent): IItemExtension<TItem>
}

/**
 * Примесь: расширение способно создавать item-адаптеры.
 * Не наследует IExtension — используется вместе с ним через множественное наследование.
 */
export interface IExtensionItems<TItem extends object = any> {
	/**
	 * Создать item-адаптер для указанного элемента.
	 * Вызывается для каждого элемента при его добавлении в коллекцию.
	 */
	createItem(owner: TItem): IItemExtension<TItem>
}
