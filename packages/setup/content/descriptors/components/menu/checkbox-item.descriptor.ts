/**
 * Дескриптор флажка меню (TMenuCheckboxItem).
 *
 * Пропсы, события и плагины — пункта (`MenuItemDescriptor`): флажок — тот же
 * пункт, который отмечается. Отметка — `selected` фасада элемента
 * (`MenuCollectionCheckboxItemDescriptor`): это выбор коллекции меню.
 *
 * Слоты объявлены заново — они не наследуются, а разметка у флажка своя: в
 * scope текста ещё и отметка, и есть слот самой отметки.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TMenuCheckboxItem } from '@soldy-ui/core'
import { MenuItemDescriptor } from './item.descriptor'

export const MenuCheckboxItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TMenuCheckboxItem,

		extends: MenuItemDescriptor(),

		contribution: {
			slots: {
				/**
				 * Подмена отметки в одном месте; по умолчанию она берётся из
				 * пакета иконок по роли `check`. Обёртка вокруг слота остаётся
				 * за компонентом: она держит колонку отметок и уносит отметку из
				 * дерева доступности — состояние объявляет `aria-checked`.
				 */
				'indicator-icon': {
					scope: { selected: defineType<boolean>(Boolean) },
					description: 'Отметка флажка',
				},
				leading: { description: 'Значок пункта' },
				default: {
					scope: {
						text: defineType<string>(String),
						selected: defineType<boolean>(Boolean),
					},
					description: 'Содержимое пункта. Задано — переопределяет проп text',
				},
				trailing: { description: 'Подсказка сочетания клавиш у конца строки' },
			},
		},
	}),
)
