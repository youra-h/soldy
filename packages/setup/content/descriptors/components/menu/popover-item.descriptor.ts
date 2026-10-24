/**
 * Дескриптор пункта с панелью (TMenuPopoverItem).
 *
 * Пропсы, события и плагины пункта — от `MenuItemDescriptor`: в меню это
 * обычный пункт — строка, подсветка, размер меню. Сверх них — открытость
 * панели, `lazyMount` её содержимого, выходы для разметки панели и плагины
 * немодальной панели у строки: нажатие и уход фокуса мимо, модель фокуса,
 * клавиша строки и связки. Членство в меню — фасад пункта
 * (`MenuCollectionItemDescriptor`): своей коллекции у пункта с панелью нет,
 * в панели лежит что угодно.
 *
 * Слоты объявлены заново — они не наследуются, а разметка у пункта с панелью
 * своя: текст строки — слот `header` (`default` занят содержимым панели, имя
 * — как у секции Accordion и у подменю), у конца строки — стрелка, подсказки
 * сочетания нет.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TMenuPopoverItem } from '@soldy-ui/core'
import { MenuItemDescriptor } from './item.descriptor'
import {
	DismissPluginDescriptor,
	IdPluginDescriptor,
	MenuPopoverItemFocusPluginDescriptor,
	MenuPopoverItemKeyboardPluginDescriptor,
	MenuPopupIdsPluginDescriptor,
} from '../../plugins'

export const MenuPopoverItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TMenuPopoverItem,

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
				 * RTL и уносит её из дерева доступности — панель объявляет
				 * `aria-haspopup`.
				 */
				'arrow-icon': { description: 'Стрелка пункта у конца строки' },
				default: { description: 'Содержимое панели: календарь, поля, палитра' },
			},
			props: {
				open: { type: Boolean, triggers: ['change:open'] },
				lazyMount: { type: Boolean, triggers: ['change:lazyMount'] },
				/**
				 * Набор панели — разметки без своего экземпляра: роль `dialog`,
				 * `id` и имя от строки (`TMenuPopupIdsPlugin`).
				 */
				panelAria: { type: Object, protected: true, triggers: ['change:panelAria'] },
				/** Смонтировано ли содержимое: `lazyMount` прячет его до первого открытия. */
				contentRendered: {
					type: Boolean,
					protected: true,
					triggers: ['change:open', 'change:lazyMount'],
				},
			},
		},

		plugins: [
			// Нажатие и уход фокуса мимо: фокус ушёл на другой пункт меню —
			// панель закрылась. Слой панели выше слоя меню, и меню нажатия в ней
			// мимо не считает
			DismissPluginDescriptor.with({ focusOutside: true }),
			// Фокус при открытии и закрытии панели, Escape и Tab; панель,
			// открытая наведением, оставляет его на строке. После dismiss: берёт
			// у него панель и `dismiss`
			MenuPopoverItemFocusPluginDescriptor,
			// Стрелка к концу строки открывает панель, а в открытую ведёт фокус.
			// После модели фокуса: берёт её при установке
			MenuPopoverItemKeyboardPluginDescriptor,
			// `id` и ссылки «пункт ↔ панель»; `id` строки — проп `id` или от
			// монтирования
			IdPluginDescriptor,
			MenuPopupIdsPluginDescriptor,
		],
	}),
)
