/**
 * `<div is="so-number-input">` — поле числа: корень, ввод внутри, кнопки шага
 * «меньше» и «больше» у конца поля и скрытое поле формы с числом.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию. Ввод и скрытое поле —
 * узлы шаблона в обычном DOM страницы, поэтому форма видит их сама:
 * `FormData` получает число из скрытого поля, `<label>` называет ввод, а
 * `<fieldset disabled>` и валидация достаются нативным полям.
 *
 * Корень с полем (`control` в описании корня), как у Input: на корне из
 * наборов ядра — `attrs` (`dir`) и `dataset` (`data-disabled`,
 * `data-invalid`), по нему тема красит коробку поля и подпись поля формы
 * `Field`; наборы ввода (`inputAttrs`, `aria`, `inputAria`) кладёт шаблон.
 * Поле — видимый ввод: статические атрибуты разметки, кроме `class`, `style`,
 * `is`, `slot` и входов пропов, база при построении переносит на него —
 * `autocomplete`, `aria-label` и `data-*` потребителя стоят на вводе. `id` —
 * проп поля: атрибут разметки база берёт пропом первой сборки, из кода —
 * `ctrl.id`, а `el.id` — собственный `id` корня.
 *
 * Разметка вынесена в number-input.template.ts, жизненный цикл — в SoldyElement.
 */

import { NumberInputDescriptor } from '@soldy-ui/setup'
import type { INumberInput } from '@soldy-ui/core'
import { SoldyElement, defineElement } from '../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../adapter'
import { numberInputTemplate } from './number-input.template'
import { setupNumberInput } from './setup.component'

export const TNumberInputElement = SoldyElement(HTMLDivElement, {
	descriptor: NumberInputDescriptor(),
	template: numberInputTemplate,
	root: { sets: ['attrs', 'dataset'], control: true },
	setup: setupNumberInput,
})

defineElement('so-number-input', TNumberInputElement, 'div')

/**
 * `<div is="so-number-input">` из JS: нативный `div`, своё элемента soldy
 * (`ctrl`, `state`) и свойства пропов дескриптора вместе с пропсами его
 * плагинов (`aria_label`) — без тех, что у `div` уже есть (`id` — собственный
 * `id` корня), и без `HOST_PROPS` (`TSoldyElementProps`).
 */
export type TNumberInputElementProps = HTMLDivElement &
	ISoldyElement<INumberInput> &
	TSoldyElementProps<typeof NumberInputDescriptor, HTMLDivElement>
