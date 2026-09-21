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
 *
 * `satisfies`, а не аннотация словарём: с аннотацией `Record<string, …>` спред
 * в `props` терял свои ключи в типах, и `defineComponent` не видел триггеров
 * списка — события `change:maxRows` и соседей выпали бы из событий ListBox и
 * Select. Триггеры сверяются с общей картой `TListEvents`: обе карты
 * компонентов её содержат.
 */

import type { TListEvents } from '@soldy/core'
import type { IComponentPropDefinition } from '../../../protected/define'

export const LIST_PROPS = {
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
} satisfies Record<string, IComponentPropDefinition<keyof TListEvents>>
