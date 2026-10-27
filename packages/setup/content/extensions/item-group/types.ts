/**
 * Контракты проводки группы элементов: что группа опускает по лифту, какой её видит проводка, и опции расширения.
 */

import type { TCollectionEngine, TItemGroupEvents } from '@soldy-ui/core'
import type { IListenable } from '@soldy-ui/plugins'
import type { TElevatorFactory } from '../../../protected/adapter/elevator'

/**
 * The link of a group with the items inside: the group's key in the
 * collection's grouping and the engine of that collection. An item takes the
 * key only if it is an item of the same engine: the items of a submenu in a
 * menu group are items of their own collection.
 *
 * `enter` — the group enters the grouping, at the latest before its first
 * item does (see `TItemGroupExtension`); a repeat does nothing.
 */
export interface IItemGroupLink {
	readonly key: string
	readonly engine: TCollectionEngine<any, any>
	enter(): void
}

/**
 * Инстанс, к которому подключается расширение: часть группы — `Menu.Group`,
 * `Menu.RadioGroup`, `ListBox.Group`, `Select.Group`. Ключ в группировке —
 * от экземпляра (`uid`), подпись — с событием её смены: карта событий у форм
 * разная, а смена подписи есть у всех.
 */
export type TItemGroupPart = {
	readonly uid: number
	readonly label: string
	readonly events: IListenable<Pick<TItemGroupEvents, 'change:label'>>
}

export interface IItemGroupExtensionOptions {
	elevator: TElevatorFactory
}
