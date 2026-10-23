/**
 * `<label is="so-label">` — подпись контрола.
 *
 * Элемент — настоящий `<label>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Всё, что браузер
 * делает для подписи, он делает и для неё: контрол — первый labelable-потомок,
 * клик по тексту переключает его, а текст становится его доступным именем.
 * Связки через `for` и `id` нет.
 *
 * Обёртки нет: корень — сам элемент потребителя. Модификаторы стороны,
 * размера и варианта, наборы ядра и скрытие раскладывает на него база, поэтому
 * шаблон — только две части подписи: контрол (слот `default`) и текст (слот
 * `content`, без него — проп `text`). Своего `disabled` у подписи нет:
 * выключенную подпись тема красит по вложенному полю.
 *
 * Разметка вынесена в label.template.ts, жизненный цикл — в ElementBase.
 */

import { LabelDescriptor } from '@soldy-ui/setup'
import type { ILabel } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementType } from '../../adapter'
import { labelTemplate } from './label.template'
import { setupLabel } from './setup.component'

export const TLabelElement = ElementBase(HTMLLabelElement, {
	descriptor: LabelDescriptor,
	template: labelTemplate,
	setup: setupLabel,
})

defineElement('so-label', TLabelElement, 'label')

/**
 * `<label is="so-label">` из JS: нативный `label`, своё элемента soldy
 * (`ctrl`, `state`) и свойства пропов дескриптора — без тех, что у `label` уже
 * есть, и без `HOST_PROPS` (`TElementProps`).
 */
export type TLabelElementProps = TElementType<typeof TLabelElement>
