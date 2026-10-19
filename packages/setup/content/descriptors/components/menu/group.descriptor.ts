/**
 * Дескриптор группы меню (TMenuGroup) — пункты под общей подписью.
 *
 * Подпись, её набор и плагин связок — от `ItemGroupDescriptor`, общей базы
 * групп меню, ListBox и Select. Своё — слот пунктов.
 */

import { defineComponent, defineDescriptor } from '../../../../protected/define'
import { TMenuGroup } from '@soldy-ui/core'
import { ItemGroupDescriptor } from '../item-group.descriptor'

export const MenuGroupDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TMenuGroup,

		extends: ItemGroupDescriptor(),

		contribution: {
			slots: {
				default: { description: 'Пункты группы' },
			},
		},
	}),
)
