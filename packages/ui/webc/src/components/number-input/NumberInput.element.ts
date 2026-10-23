/**
 * `<div is="so-number-input">` — поле числа: корень, ввод внутри, кнопки шага
 * «меньше» и «больше» у конца поля и скрытое поле формы с числом.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Ввод и скрытое поле —
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
 * Разметка вынесена в number-input.template.ts, жизненный цикл — в ElementBase.
 */

import { NumberInputDescriptor } from '@soldy-ui/setup'
import type { INumberInput } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { IElementBase, TElementProps } from '../../adapter'
import { numberInputTemplate } from './number-input.template'
import { setupNumberInput } from './setup.component'

export const TNumberInputElement = ElementBase(HTMLDivElement, {
	descriptor: NumberInputDescriptor(),
	template: numberInputTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], control: true },
	setup: setupNumberInput,
})

defineElement('so-number-input', TNumberInputElement, 'div')

/**
 * `<div is="so-number-input">` из JS: нативный `div`, своё элемента soldy
 * (`ctrl`, `state`) и свойства пропов дескриптора вместе с пропсами его
 * плагинов (`aria_label`) — без тех, что у `div` уже есть (`id` — собственный
 * `id` корня), и без `HOST_PROPS` (`TElementProps`).
 */
export type TNumberInputElementProps = HTMLDivElement &
	IElementBase<INumberInput> &
	TElementProps<typeof NumberInputDescriptor, HTMLDivElement>
