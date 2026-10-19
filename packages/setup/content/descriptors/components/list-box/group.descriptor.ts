/**
 * Дескриптор группы списка (TListBoxGroup) — элементы ListBox под общей
 * подписью.
 *
 * Подпись, её набор и плагин связок — от `ItemGroupDescriptor`, общей базы
 * групп меню, ListBox и Select. Своё — слот элементов. Группы из данных
 * (`_: { group }`, `groupBy`, `groups`) список рисует этой частью сам, по
 * секциям нарисованного.
 */

import { defineComponent, defineDescriptor } from '../../../../protected/define'
import { TListBoxGroup } from '@soldy-ui/core'
import { ItemGroupDescriptor } from '../item-group.descriptor'

export const ListBoxGroupDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TListBoxGroup,

		extends: ItemGroupDescriptor(),

		contribution: {
			slots: {
				default: { description: 'Элементы группы' },
			},
		},
	}),
)
