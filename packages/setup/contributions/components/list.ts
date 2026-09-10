import type { IPropDefinition } from '@soldy/accessor'
import { defineType } from '../defineType'
import type { TListContentFit, TListIndicator, TScrollBehavior } from '@soldy/core'

/**
 * Списочные props — общие для ListBox и Select.
 *
 * Объявлены один раз и подмешиваются в contribution обоих компонентов. Это
 * зеркало контракта `IList` из ядра: там типы, здесь декларация для аксессора.
 *
 * Общего предка у компонентов нет и быть не может (`TValueControl` против
 * `TInputControl`), поэтому наследовать нечего — но повторять четыре
 * декларации в двух файлах тоже незачем. Что копии не разойдутся с ядром,
 * проверяет `core/__tests__/list-contract.spec.ts`.
 */
export const LIST_PROPS: Record<string, IPropDefinition> = {
	maxRows: {
		type: Number,
		triggers: ['change:maxRows'],
	},
	contentFit: {
		type: defineType<TListContentFit>(String),
		triggers: ['change:contentFit'],
	},
	scrollBehavior: {
		type: defineType<TScrollBehavior>(String),
		triggers: ['change:scrollBehavior'],
	},
	indicator: {
		type: defineType<TListIndicator>(String),
		triggers: ['change:indicator'],
	},
}
