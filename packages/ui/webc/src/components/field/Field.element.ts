/**
 * `<div is="so-field">` — поле формы: подпись, контрол, подсказка и ошибка,
 * связанные с контролом сами.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Обёртки нет: корень —
 * сам элемент потребителя. Модификаторы стороны и размера, наборы ядра и
 * скрытие раскладывает на него база, а части поля строит шаблон. Своих
 * состояний у Field нет: выключенность, только чтение и обязательность тема
 * читает с корня контрола, ошибку контрол рисует по своему `data-invalid` —
 * его пишет связка поля с контролом.
 *
 * Связку поле опускает лифтом своему хосту, и контрол в его свете находит её
 * вверх по документу. Разметку, ожившую при регистрации, база собирает по
 * месту (`deferral.ts`): поле — раньше контрола в нём, и связку контрол
 * находит уже опущенной.
 *
 * Разметка вынесена в field.template.ts, жизненный цикл — в ElementBase.
 */

import { FieldDescriptor } from '@soldy-ui/setup'
import type { IField } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { fieldTemplate } from './field.template'
import { setupField } from './setup.component'

export const TFieldElement: TElementClassOf<typeof HTMLDivElement, typeof FieldDescriptor, IField> =
	ElementBase(HTMLDivElement, {
		descriptor: FieldDescriptor,
		template: fieldTemplate,
		setup: setupField,
	})

defineElement('so-field', TFieldElement, 'div')

/**
 * `<div is="so-field">` из JS: нативный `div`, своё элемента soldy (`ctrl`,
 * `state`) и свойства пропов дескриптора — без тех, что у `div` уже есть, и
 * без `HOST_PROPS` (`TElementProps`).
 */
export type TFieldElementProps = TElementType<typeof TFieldElement>
