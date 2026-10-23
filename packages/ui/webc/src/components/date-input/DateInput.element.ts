/**
 * `<div is="so-date-input">` — поле даты из частей по формату локали: день,
 * месяц и год, а у поля даты и времени — ещё час, минута, с точностью до
 * секунды секунда и, у 12-часового цикла, период суток.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Корень — коробка поля
 * семьи Input и группа частей (`role="group"`): на нём все три набора ядра —
 * `attrs` (`dir`), `aria` (роль группы, имя — `aria_label` или
 * `aria_labelledBy`) и `dataset` (`data-disabled`, `data-invalid`), — как у
 * Vue. Поля в корне нет: части — узлы шаблона без своего `<input>`, и
 * атрибуты разметки потребителя остаются на корне, как атрибуты снаружи у Vue
 * падают на корень. Значение для формы — скрытое поле шаблона в обычном DOM
 * страницы: `FormData` получает дату строкой.
 *
 * Разметка вынесена в date-input.template.ts, жизненный цикл — в ElementBase.
 */

import { DateInputDescriptor } from '@soldy-ui/setup'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementType } from '../../adapter'
import { dateInputTemplate } from './date-input.template'
import { setupDateInput } from './setup.component'

export const TDateInputElement = ElementBase(HTMLDivElement, {
	descriptor: DateInputDescriptor,
	template: dateInputTemplate,
	setup: setupDateInput,
})

defineElement('so-date-input', TDateInputElement, 'div')

/**
 * `<div is="so-date-input">` из JS: нативный `div`, своё элемента soldy
 * (`ctrl`, `state`) и свойства пропов дескриптора вместе с пропсами его
 * плагинов (`aria_label`) — без тех, что у `div` уже есть (`id` — `id`
 * корня), и без `HOST_PROPS` (`TElementProps`).
 */
export type TDateInputElementProps = TElementType<typeof TDateInputElement>
