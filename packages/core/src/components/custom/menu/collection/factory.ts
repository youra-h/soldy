import { TMenuExtension, TMenuSubmenusExtension } from './extensions'
import type { TMenuEngineOptions } from './extensions'
import { TFactoryExtension, TGroupExtension, TSelectionExtension } from './../../../base/collection'
import { baseExtensions, completeEngine } from './../../../base/collection/create/internal'
import type { TExtensionSet } from './../../../base/collection/create/internal'
import TMenuItem from './../item/item.class'
import type { IMenuItem } from './../item/types'

/**
 * Детали рабочей коллекции меню — по порядку установки. См. `tabsExtensions`.
 *
 * `submenus` — подменю из данных: пункт с вложенным `items` становится
 * подменю со своим движком меню. Стоит до фабрики: подписчики
 * `item:add:before` идут по порядку установки, и источник с `items` становится
 * подменю раньше, чем фабрика сделала бы из него действие. Движок подменю
 * собран из этих же деталей, поэтому уровней сколько угодно; владельца в него
 * пишет фасад смонтированного подменю.
 *
 * `selection.mode` — `'multiple'`, а не `'single'` из `TSelectionExtension`:
 * выбор у меню — отметки флажков, и каждый флажок отмечается сам по себе.
 * Переопределение только здесь, дефолт самого расширения не трогаем; движок,
 * пришедший снаружи со своим выбором, в тот же режим переводит фасад.
 *
 * `group` — группы пунктов из данных: показанное идёт по группам, и меню
 * рисует его секциями. Отбора и сортировки у меню нет — переставить
 * показанное после группировки некому.
 *
 * `draw` нет: меню рисует свои пункты все, окна у него не бывает.
 */
export function menuExtensions(): TExtensionSet<IMenuItem> {
	return {
		...baseExtensions<IMenuItem>(),
		submenus: () =>
			new TMenuSubmenusExtension({
				createEngine: () =>
					completeEngine<IMenuItem, TMenuEngineOptions>(undefined, menuExtensions()),
			}),
		factory: () => new TFactoryExtension<IMenuItem>({ itemCtor: TMenuItem }),
		selection: () => {
			const selection = new TSelectionExtension<IMenuItem>()

			selection.mode = 'multiple'

			return selection
		},
		group: () => new TGroupExtension<IMenuItem>(),
		menu: () => new TMenuExtension(),
	}
}
