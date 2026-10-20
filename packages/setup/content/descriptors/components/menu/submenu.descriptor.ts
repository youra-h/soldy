/**
 * Дескриптор пункта с подменю (TMenuSubmenu).
 *
 * Пропсы, события и плагины пункта — от `MenuItemDescriptor`: в меню над ним
 * это обычный пункт — строка, подсветка, размер меню. Сверх них — открытость,
 * разделители секций своих пунктов, наборы панели и плагины владельца своих
 * пунктов: коллекция, нажатие и уход фокуса мимо, клавиши уровня, указатель,
 * модель фокуса и связки. Членство в меню над ним — фасад пункта
 * (`MenuCollectionItemDescriptor`), свои пункты — фасад меню
 * (`MenuCollectionDescriptor`): у каждого уровня меню своя коллекция.
 *
 * Слоты объявлены заново — они не наследуются, а разметка у пункта с подменю
 * своя: текст строки — слот `header` (`default` занят пунктами подменю, имя —
 * как у секции Accordion), у конца строки — стрелка, подсказки сочетания нет.
 * Слоты пунктов из `items` — те же, что у меню (`item`, `item-*`): подменю
 * из данных пункт отдаёт их под теми же именами, и они одни на все уровни.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TMenuSubmenu } from '@soldy-ui/core'
import type { IMenuItem } from '@soldy-ui/core'
import { MenuItemDescriptor } from './item.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	DismissPluginDescriptor,
	MenuHoverPluginDescriptor,
	MenuPopupIdsPluginDescriptor,
	MenuSubmenuFocusPluginDescriptor,
	MenuSubmenuKeyboardPluginDescriptor,
} from '../../plugins'

export const MenuSubmenuDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TMenuSubmenu,

		extends: MenuItemDescriptor(),

		contribution: {
			slots: {
				leading: { description: 'Значок пункта' },
				header: {
					scope: {
						text: defineType<string>(String),
						open: defineType<boolean>(Boolean),
					},
					description: 'Текст строки пункта. Задан — переопределяет проп text',
				},
				/**
				 * Подмена стрелки в одном месте; по умолчанию она берётся из пакета
				 * иконок по роли `arrowRight`. Обёртка вокруг слота остаётся за
				 * компонентом: она держит место у конца строки, зеркалит стрелку в
				 * RTL и уносит её из дерева доступности — подменю объявляет
				 * `aria-haspopup`.
				 */
				'arrow-icon': { description: 'Стрелка подменю у конца строки' },
				default: { description: 'Пункты подменю, группы и разделители' },
				item: {
					scope: {
						item: defineType<IMenuItem>(Object),
						text: defineType<string>(String),
					},
					description: 'Содержимое пункта-действия подменю при работе через проп items',
				},
				'item-leading': {
					scope: { item: defineType<IMenuItem>(Object) },
					description:
						'Значок пункта подменю — действия и подменю — при работе через проп items',
				},
				'item-trailing': {
					scope: { item: defineType<IMenuItem>(Object) },
					description: 'Подсказка сочетания клавиш при работе через проп items',
				},
				'item-header': {
					scope: {
						item: defineType<IMenuItem>(Object),
						text: defineType<string>(String),
						open: defineType<boolean>(Boolean),
					},
					description: 'Текст строки вложенного подменю при работе через проп items',
				},
				'item-arrow-icon': {
					scope: { item: defineType<IMenuItem>(Object) },
					description: 'Стрелка вложенного подменю при работе через проп items',
				},
				'item-content': {
					scope: { item: defineType<IMenuItem>(Object) },
					description:
						'Пункты вложенного подменю разметкой вместо его items. Пусто — оно рисует свои пункты из данных',
				},
			},
			props: {
				open: { type: Boolean, triggers: ['change:open'] },
				/**
				 * Рисовать ли разделитель между соседними секциями группировки своих
				 * пунктов из данных — как у меню: свои секции рисует разметка
				 * подменю.
				 */
				groupSeparators: { type: Boolean, triggers: ['change:groupSeparators'] },
				/**
				 * Набор панели подменю — разметки без своего экземпляра: роль
				 * `menu`, `id` и имя от строки (`TMenuPopupIdsPlugin`).
				 */
				panelAria: { type: Object, protected: true, triggers: ['change:panelAria'] },
				/**
				 * Классы панели — блок `so-menu__panel` с размером и вариантом
				 * подменю: панель телепортирована, и модификаторы пункта до неё не
				 * доходят.
				 */
				panelClasses: {
					type: Object,
					protected: true,
					triggers: ['change:panelClasses'],
				},
			},
		},

		plugins: [
			// Свои пункты: реестр bundles и доступ к их узлам
			CollectionBundlesPluginDescriptor,
			CollectionElementsPluginDescriptor,
			// Нажатие и уход фокуса мимо: фокус ушёл на другой пункт меню над
			// подменю — оно закрылось. Слой подменю выше, и меню над ним нажатия в
			// нём мимо не считает
			DismissPluginDescriptor.with({ focusOutside: true }),
			// Клавиши строки и панели, подсветка — фокус. После dismiss: берёт у
			// него панель
			MenuSubmenuKeyboardPluginDescriptor,
			// Указатель в панели: подсветка, панели пунктов ниже и путь к ним
			MenuHoverPluginDescriptor,
			// Фокус при открытии и закрытии уровня, Escape и Tab. После dismiss и
			// клавиатуры: берёт у них панель, `dismiss` и строку подсвеченного
			MenuSubmenuFocusPluginDescriptor,
			// `id` и ссылки «пункт ↔ подменю»
			MenuPopupIdsPluginDescriptor,
		],
	}),
)
