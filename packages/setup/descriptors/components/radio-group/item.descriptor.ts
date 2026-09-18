/**
 * Дескриптор RadioGroupItem (TRadioGroupItem).
 *
 * Наследует `ValueControlDescriptor` (value, name, disabled, focused, size,
 * variant, ...) и добавляет `view`. Текста у радио нет — это голый контрол,
 * как CheckBox: подпись кладут слотом, а без неё имя дают `aria_label` или
 * `aria_labelledBy`. `size`, `variant`, `view` и `name` раздаёт группа.
 */

import { defineComponent, defineDescriptor } from '../../../define'
import { TRadioGroupItem } from '@soldy/core'
import type { IRadioGroupItemProps, TRadioGroupItemEvents } from '@soldy/core'
import { ValueControlDescriptor } from '../value-control.descriptor'
import type { TEmptySlotScope } from '../../../define'

/**
 * Слоты радио. Один — подпись: она лежит внутри корня-`label`, поэтому клик
 * по ней выбирает радио, а текст становится его доступным именем.
 */
export type TRadioGroupItemSlots = {
	default: TEmptySlotScope
}

export const RadioGroupItemDescriptor = defineDescriptor(() =>
	defineComponent<IRadioGroupItemProps, TRadioGroupItemEvents, TRadioGroupItemSlots>()({
		ctor: TRadioGroupItem,

		extends: ValueControlDescriptor(),

		contribution: {
			slots: {
				default: { description: 'Подпись радио' },
			},
			props: {
				view: { type: String, triggers: ['change:view'] },
			},
		},
	}),
)
