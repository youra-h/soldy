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

import type { IPropDefinition } from '@soldy/accessor'

export const LIST_PROPS: Record<string, IPropDefinition> = {
	maxRows: {
		type: Number,
		triggers: ['change:maxRows'],
	},
	contentFit: {
		type: String,
		triggers: ['change:contentFit'],
	},
	scrollBehavior: {
		type: String,
		triggers: ['change:scrollBehavior'],
	},
	indicator: {
		type: String,
		triggers: ['change:indicator'],
	},
}
