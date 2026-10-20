/**
 * Контракты проводки группы элементов: что группа опускает по лифту, какой её видит проводка, и опции расширения.
 */

import type { TCollectionEngine, TItemGroupEvents } from '@soldy-ui/core'
import type { IListenable } from '@soldy-ui/plugins'
import type { TElevatorFactory } from '../../../protected/adapter/elevator'

/**
 * Связка группы с элементами внутри: ключ группы в группировке коллекции и
 * движок этой коллекции. Элемент берёт ключ, только если он элемент того же
 * движка: пункты подменю в группе меню — элементы своей коллекции.
 */
export interface IItemGroupLink {
	readonly key: string
	readonly engine: TCollectionEngine<any, any>
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
