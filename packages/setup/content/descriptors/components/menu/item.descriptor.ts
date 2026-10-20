/**
 * Дескриптор пункта меню (TMenuItem) — действие.
 *
 * Наследует `ValueControlDescriptor` (value, name, disabled, focused, size,
 * variant, ...), добавляет `text` и плагин подсветки (`TListItemPlugin`): по
 * пунктам ходит подсветка, и она же — фокус.
 *
 * Размер пункту диктует меню, поэтому вход `size` снят. `variant` — вход, как
 * у тега: вариант у пункта свой («Удалить» — опасный), и меню его не пишет —
 * пункт без своего тема красит вариантом меню.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TMenuItem } from '@soldy-ui/core'
import { rowIn } from '@soldy-ui/plugins'
import { ValueControlDescriptor } from '../value-control.descriptor'
import { ActionPluginDescriptor, ListItemPluginDescriptor } from '../../plugins'

export const MenuItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TMenuItem,

		extends: ValueControlDescriptor(),

		contribution: {
			slots: {
				leading: { description: 'Значок пункта' },
				default: {
					scope: { text: defineType<string>(String) },
					description: 'Содержимое пункта. Задано — переопределяет проп text',
				},
				trailing: { description: 'Подсказка сочетания клавиш у конца строки' },
			},
			props: {
				// Размер пункта задаёт меню: вход снят. Вариант — свой, вход
				// остаётся от `ValueControlDescriptor`
				size: { protected: true },
				text: { type: String, triggers: ['change:text'] },
			},
		},

		plugins: [
			// Фокус держит строка пункта — ей фокус ставит и клавиатура меню, — а
			// корень — обёртка вокруг неё: туда `focused = true` и ставит фокус.
			// Флажок, переключатель и пункты со своей панелью наследуют правило
			ActionPluginDescriptor.with({ focusTarget: rowIn }),
			ListItemPluginDescriptor,
		],
	}),
)
