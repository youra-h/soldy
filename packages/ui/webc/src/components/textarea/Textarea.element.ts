/**
 * `<div is="so-textarea">` — многострочное поле: корень и `<textarea>` внутри,
 * под ним — счётчик символов.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Поле — узел шаблона в
 * обычном DOM страницы, поэтому форма видит его сама: `FormData`, `<label>`,
 * `<fieldset disabled>` и валидация достаются нативному полю, а связанного с
 * формой элемента (`formAssociated`) не нужно.
 *
 * Корень с полем (`control` в описании корня), как у Input: на корне из
 * наборов ядра — `attrs` (`dir`) и `dataset` (`data-disabled`,
 * `data-invalid`, `data-limit`), по нему тема красит рамку и счётчик; `aria`
 * — на поле, его кладёт шаблон. Статические атрибуты разметки, кроме
 * `class`, `style`, `is`, `slot` и входов пропов, база при построении
 * переносит на поле: `autocomplete`, `aria-label`, `tabindex` и `data-*`
 * потребителя стоят на `<textarea>`. `id` — проп поля: атрибут разметки база
 * берёт пропом первой сборки, из кода — `ctrl.id`, а `el.id` — собственный
 * `id` корня.
 *
 * Разметка вынесена в textarea.template.ts, жизненный цикл — в ElementBase.
 */

import { TextareaDescriptor } from '@soldy-ui/setup'
import type { ITextarea } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { IElementBase, TElementProps } from '../../adapter'
import { textareaTemplate } from './textarea.template'
import { setupTextarea } from './setup.component'

export const TTextareaElement = ElementBase(HTMLDivElement, {
	descriptor: TextareaDescriptor(),
	template: textareaTemplate,
	root: { sets: ['attrs', 'dataset'], control: true },
	setup: setupTextarea,
})

defineElement('so-textarea', TTextareaElement, 'div')

/**
 * `<div is="so-textarea">` из JS: нативный `div`, своё элемента soldy (`ctrl`,
 * `state`) и свойства пропов дескриптора вместе с пропсами его плагинов
 * (`aria_label`) — без тех, что у `div` уже есть (`id` — собственный `id`
 * корня), и без `HOST_PROPS` (`TElementProps`).
 */
export type TTextareaElementProps = HTMLDivElement &
	IElementBase<ITextarea> &
	TElementProps<typeof TextareaDescriptor, HTMLDivElement>
