/**
 * Дескриптор опции Select (TSelectItem).
 *
 * Наследует ValueControlDescriptor (value, name, disabled, focused, size,
 * variant, ...) и добавляет text.
 *
 * `TListItemPlugin` даёт `listItem_highlighted` — визуальную подсветку при
 * навигации с клавиатуры. Она не то же самое, что выбор: подсветка живёт,
 * только пока панель открыта, и в `value` не попадает.
 */

import { defineComponent } from '../../base'
import { TSelectItem } from '@soldy/core'
import type { ISelectItemProps, TSelectItemEvents } from '@soldy/core'
import { SelectItemContribution, type TSelectItemSlots } from '../../../contributions'
import { ValueControlDescriptor } from '../value-control.descriptor'
import { ListItemPluginDescriptor } from '../../plugins'

export const SelectItemDescriptor = () =>
	defineComponent<ISelectItemProps, TSelectItemEvents, TSelectItemSlots>()({
		ctor: TSelectItem,

		extends: ValueControlDescriptor(),

		contribution: SelectItemContribution(),

		plugins: [ListItemPluginDescriptor()],
	})
