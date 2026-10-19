/**
 * Дескриптор группы опций Select (TSelectGroup) — опции списка панели под
 * общей подписью.
 *
 * Подпись, её набор и плагин связок — от `ItemGroupDescriptor`, общей базы
 * групп меню, ListBox и Select. Своё — слот опций. Группы из данных
 * (`_: { group }`, `groupBy`, `groups`) Select рисует этой частью сам, по
 * секциям нарисованного.
 */

import { defineComponent, defineDescriptor } from '../../../../protected/define'
import { TSelectGroup } from '@soldy-ui/core'
import { ItemGroupDescriptor } from '../item-group.descriptor'

export const SelectGroupDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TSelectGroup,

		extends: ItemGroupDescriptor(),

		contribution: {
			slots: {
				default: { description: 'Опции группы' },
			},
		},
	}),
)
