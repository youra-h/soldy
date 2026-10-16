/**
 * `<span is="so-check-box">` — флажок: корень и нативный
 * `<input type="checkbox">` внутри, рядом — коробка с отметкой.
 *
 * Элемент — настоящий `<span>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию, строчный — флажок
 * кладут в подпись `Label`, а внутри `label` HTML разрешает только строчную
 * разметку. Поле — узел шаблона в обычном DOM страницы, поэтому форма видит
 * его сама: `FormData`, `<label>`, `<fieldset disabled>` и валидация
 * достаются нативному полю.
 *
 * Корень с полем (`control` в описании корня): на корне из наборов ядра только
 * `attrs` (`dir`), `aria` — на поле, его кладёт шаблон. Статические атрибуты
 * разметки, кроме `class`, `style`, `is`, `slot` и входов пропов, база при
 * построении переносит на поле: `aria-label`, `tabindex` и `data-*`
 * потребителя стоят на `<input>`. `id` — проп поля: атрибут разметки база
 * берёт пропом первой сборки, из кода — `ctrl.id`, а `el.id` — собственный
 * `id` корня.
 *
 * Разметка вынесена в check-box.template.ts, жизненный цикл — в SoldyElement.
 */

import { CheckBoxDescriptor } from '@soldy-ui/setup'
import type { ICheckBox, ICheckBoxProps } from '@soldy-ui/core'
import { SoldyElement, defineElement } from '../../adapter'
import type { ISoldyElement, THostProp } from '../../adapter'
import { checkBoxTemplate } from './check-box.template'
import { setupCheckBox } from './setup.component'

export const TCheckBoxElement = SoldyElement(HTMLSpanElement, {
	descriptor: CheckBoxDescriptor(),
	template: checkBoxTemplate,
	root: { sets: ['attrs'], control: true },
	setup: setupCheckBox,
})

defineElement('so-check-box', TCheckBoxElement, 'span')

/**
 * `<span is="so-check-box">` из JS: нативный `span`, своё элемента soldy
 * (`ctrl`, `state`) и props дескриптора — без тех, что у `span` уже есть
 * (`id` — собственный `id` корня), и без `HOST_PROPS`.
 */
export type TCheckBoxElementProps = HTMLSpanElement &
	ISoldyElement<ICheckBox> &
	Omit<ICheckBoxProps, keyof HTMLSpanElement | THostProp>
