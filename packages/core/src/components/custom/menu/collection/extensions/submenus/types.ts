import type { IExtension } from '../../../../../base/collection'
import type { IMenuItem } from '../../../item/types'
import type { IMenuSubmenu } from '../../../submenu/types'
import type { TMenuCollection } from '../../types'

/**
 * Подменю из данных: пункт и движок его пунктов — то, из чего разметка
 * собирает `Menu.Submenu` (`ctrl` и `engine`). Тот же вход, через который
 * подменю разметкой получает готовый движок снаружи.
 */
export type TMenuSubmenuEntry = {
	/** Пункт с подменю — в коллекции меню над ним */
	readonly ctrl: IMenuSubmenu
	/** Его пункты — своя коллекция меню, без владельца, пока подменю не смонтировано */
	readonly engine: TMenuCollection
}

/**
 * Подменю из данных по пункту. Снимок: на каждую смену — новый, записи
 * подменю в нём те же.
 */
export type TMenuSubmenuEntries = ReadonlyMap<IMenuItem, TMenuSubmenuEntry>

export type TMenuSubmenusExtensionEvents = {
	/**
	 * Пришло или ушло подменю из данных. Раз на запись — в её конце, следом за
	 * `change:items`; патч, который подменю не добавил и не убрал, молчит
	 */
	'change:submenus': (entries: TMenuSubmenuEntries) => void
}

/** Опции расширения подменю из данных. */
export interface IMenuSubmenusExtensionOptions {
	/**
	 * Пустой движок меню — коллекция пунктов нового подменю. Передаёт его тот,
	 * кто собирает детали меню (`menuExtensions`): сборщик движка меню стоит
	 * над расширением, и его импорт отсюда замкнул бы цикл модулей
	 */
	createEngine: () => TMenuCollection
}

/**
 * Контракт расширения подменю из данных: пункт данными с массивом `items`
 * становится подменю, а его `items` — составом своего движка.
 */
export interface IMenuSubmenusExtension extends IExtension<
	IMenuItem,
	TMenuSubmenusExtensionEvents
> {
	/** Подменю из данных по пункту — снимок, на каждую смену новый */
	readonly entries: TMenuSubmenuEntries
}
