/**
 * Дескриптор RadioGroup (TRadioGroup).
 *
 * Наследует `ValueControlDescriptor` (value, name, disabled, focused, size,
 * variant, ...) и добавляет `view`. Плагинов коллекции нет: радио нативные, и
 * клавиатуру группы даёт браузер по общему `name` — стрелки, пропуск
 * выключенных, одну остановку Tab.
 *
 * `value`, а не выбор элементов наружу: потребителю нужен ответ в значениях,
 * и он же уходит в форму. `view`, `size` и `variant` задаются группе, а тема
 * читает их с каждого радио — раздаёт их `TRadioGroupExtension`.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TRadioGroup } from '@soldy-ui/core'
import type { IRadioGroupItem } from '@soldy-ui/core'
import { ValueControlDescriptor } from '../value-control.descriptor'

export const RadioGroupDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TRadioGroup,

		extends: ValueControlDescriptor(),

		contribution: {
			/**
			 * `default` — радио группы: `RadioGroup.Item` где угодно внутри, хоть в
			 * строках чужого списка. `item` — подпись радио, когда их задали пропом
			 * `items`; слот статический и получает радио через scope.
			 */
			slots: {
				default: { description: 'Радио группы — компоненты RadioGroup.Item' },
				item: {
					scope: { item: defineType<IRadioGroupItem>(Object) },
					description: 'Подпись радио при работе через проп items',
				},
			},
			props: {
				view: { type: String, triggers: ['change:view'] },
			},
		},
	}),
)
