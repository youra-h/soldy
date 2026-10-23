/**
 * `<div is="so-input">` — текстовое поле: корень и `<input>` внутри, по
 * сторонам — слоты `leading` и `trailing`.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Поле — узел шаблона в
 * обычном DOM страницы, поэтому форма видит его сама: `FormData`, `<label>`,
 * `<fieldset disabled>` и валидация достаются нативному полю, а связанного с
 * формой элемента (`formAssociated`) не нужно.
 *
 * Корень с полем (`control` в описании корня): на корне из наборов ядра —
 * `attrs` (`dir`) и `dataset` (`data-disabled`, `data-invalid`), по нему тема
 * красит коробку поля и подпись поля формы `Field`; `aria` — на поле, его
 * кладёт шаблон. Статические атрибуты
 * разметки, кроме `class`, `style`, `is`, `slot` и входов пропов, база при
 * построении переносит на поле: `autocomplete`, `aria-label`, `tabindex` и
 * `data-*` потребителя стоят на `<input>`. `id` — проп поля: атрибут разметки
 * база берёт пропом первой сборки, из кода — `ctrl.id`, а `el.id` —
 * собственный `id` корня.
 *
 * Разметка вынесена в input.template.ts, жизненный цикл — в ElementBase.
 */

import { InputDescriptor } from '@soldy-ui/setup'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementType } from '../../adapter'
import { inputTemplate } from './input.template'
import { setupInput } from './setup.component'

export const TInputElement = ElementBase(HTMLDivElement, {
	descriptor: InputDescriptor,
	template: inputTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], control: true },
	setup: setupInput,
})

defineElement('so-input', TInputElement, 'div')

/**
 * `<div is="so-input">` из JS: нативный `div`, своё элемента soldy (`ctrl`,
 * `state`) и свойства пропов дескриптора вместе с пропсами его плагинов
 * (`aria_label`) — без тех, что у `div` уже есть (`id` — собственный `id`
 * корня), и без `HOST_PROPS` (`TElementProps`).
 */
export type TInputElementProps = TElementType<typeof TInputElement>
