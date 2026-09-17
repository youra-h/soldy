/**
 * Дескриптор TagsItem (TTagsItem).
 *
 * Наследует `ValueControlDescriptor` (value, name, disabled, focused, size,
 * variant, ...), добавляет `text`, `closable`, `closeLabel`, `closeAria`.
 * Плагина подсветки здесь нет — в отличие от ListBoxItem тег не участвует в
 * клавиатурной навигации списка.
 */

import { defineComponent, defineDescriptor } from '../../../define'
import { TTagsItem } from '@soldy/core'
import type { ITagsItemProps, TTagsItemEvents } from '@soldy/core'
import { TagsItemContribution } from '../../../contributions'
import { ValueControlDescriptor } from '../value-control.descriptor'

export const TagsItemDescriptor = defineDescriptor(() =>
	defineComponent<ITagsItemProps, TTagsItemEvents>()({
		ctor: TTagsItem,

		extends: ValueControlDescriptor(),

		contribution: TagsItemContribution(),
	}),
)
