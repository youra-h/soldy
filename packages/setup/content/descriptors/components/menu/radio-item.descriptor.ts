/**
 * Дескриптор переключателя меню (TMenuRadioItem).
 *
 * Пропсы, события и плагины — пункта (`MenuItemDescriptor`): переключатель —
 * тот же пункт, который отмечается один в своей группе. Отметка — `selected`
 * фасада элемента (`MenuCollectionRadioItemDescriptor`): это выбор коллекции
 * меню.
 *
 * Группа (`group`) защищена: в разметке её не задают — её пишет проводка,
 * ближайшая `Menu.RadioGroup` над пунктом (`TMenuRadioItemExtension`). Из кода
 * группу передают конструктору или пишут свойству.
 *
 * Слоты объявлены заново — они не наследуются; разметка — как у флажка: в
 * scope текста ещё и отметка, и есть слот самой отметки — точки.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TMenuRadioItem } from '@soldy-ui/core'
import { MenuItemDescriptor } from './item.descriptor'

export const MenuRadioItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TMenuRadioItem,

		extends: MenuItemDescriptor(),

		contribution: {
			props: {
				// Группу пишет проводка по месту в разметке: входа нет
				group: { protected: true },
			},
			slots: {
				/**
				 * Подмена отметки в одном месте; по умолчанию это точка темы.
				 * Обёртка вокруг слота остаётся за компонентом: она держит
				 * колонку отметок и уносит отметку из дерева доступности —
				 * состояние объявляет `aria-checked`.
				 */
				'indicator-icon': {
					scope: { selected: defineType<boolean>(Boolean) },
					description: 'Отметка переключателя',
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
