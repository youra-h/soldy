/**
 * `<span is="so-check-box">` — флажок: корень и нативный
 * `<input type="checkbox">` внутри, рядом — коробка с отметкой.
 *
 * Элемент — настоящий `<span>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию, строчный — флажок
 * кладут в подпись `Label`, а внутри `label` HTML разрешает только строчную
 * разметку. Поле — узел шаблона в обычном DOM страницы, поэтому форма видит
 * его сама: `FormData`, `<label>`, `<fieldset disabled>` и валидация
 * достаются нативному полю.
 *
 * Корень с полем (`control` в описании корня): на корне из наборов ядра —
 * `attrs` (`dir`) и `dataset` (`data-disabled`, `data-invalid`), по нему тема
 * красит коробку и подпись поля формы `Field`; `aria` — на поле, его кладёт
 * шаблон. Статические атрибуты
 * разметки, кроме `class`, `style`, `is`, `slot` и входов пропов, база при
 * построении переносит на поле: `aria-label`, `tabindex` и `data-*`
 * потребителя стоят на `<input>`. `id` — проп поля: атрибут разметки база
 * берёт пропом первой сборки, из кода — `ctrl.id`, а `el.id` — собственный
 * `id` корня.
 *
 * Разметка вынесена в check-box.template.ts, жизненный цикл — в ElementBase.
 */

import { CheckBoxDescriptor } from '@soldy-ui/setup'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementType } from '../../adapter'
import { checkBoxTemplate } from './check-box.template'
import { setupCheckBox } from './setup.component'

export const TCheckBoxElement = ElementBase(HTMLSpanElement, {
	descriptor: CheckBoxDescriptor,
	template: checkBoxTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], control: true },
	setup: setupCheckBox,
})

defineElement('so-check-box', TCheckBoxElement, 'span')

/**
 * `<span is="so-check-box">` из JS: нативный `span`, своё элемента soldy
 * (`ctrl`, `state`) и свойства пропов дескриптора вместе с пропсами его
 * плагинов (`aria_label`) — без тех, что у `span` уже есть (`id` — собственный
 * `id` корня), и без `HOST_PROPS` (`TElementProps`).
 */
export type TCheckBoxElementProps = TElementType<typeof TCheckBoxElement>
