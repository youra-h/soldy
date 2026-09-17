/**
 * Дескриптор ListBoxItem (TListBoxItem).
 *
 * Наследует `ValueControlDescriptor` (value, name, disabled, focused, size,
 * variant, ...), добавляет `text`, `contentFit` и плагин подсветки элемента
 * (клавиатурная навигация).
 */

import { defineComponent, defineDescriptor } from '../../../define'
import { TListBoxItem } from '@soldy/core'
import type { IListBoxItemProps, TListBoxItemEvents } from '@soldy/core'
import { ListBoxItemContribution } from '../../../contributions'
import { ValueControlDescriptor } from '../value-control.descriptor'
import { ListItemPluginDescriptor } from '../../plugins'

export const ListBoxItemDescriptor = defineDescriptor(() =>
	defineComponent<IListBoxItemProps, TListBoxItemEvents>()({
		ctor: TListBoxItem,

		extends: ValueControlDescriptor(),

		contribution: ListBoxItemContribution(),

		plugins: [ListItemPluginDescriptor()],
	}),
)
