/**
 * `<div is="so-date-picker">` — поле даты и календарь в панели, как Select —
 * поле и список: одна дата или диапазон.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег корня у Vue. Корень — якорь панели: она
 * открывается под ним от его начала, у края окна — над ним. На корне — `attrs`,
 * `dataset` (`data-open`, `data-disabled`) и набор корня `rootAria` слоем
 * `aria` (описание корня): у диапазона корень — группа полей концов со своим
 * именем, у одной даты группа — само поле, набор корня пуст, а `aria`
 * DatePicker шаблон кладёт на поле. Атрибуты разметки потребителя остаются на
 * корне, как у Vue: `<input>` под них у DatePicker нет.
 *
 * Поля — детали DateInput над экземплярами полей DatePicker, календарь —
 * деталь Calendar над его календарём и движком, панель — деталь Frame: в
 * `body` её уводит база самого Frame. Значение в форму отдают поля — скрытым
 * полем каждого.
 *
 * Разметка вынесена в date-picker.template.ts, жизненный цикл — в
 * SoldyElement.
 */

import { DatePickerDescriptor } from '@soldy-ui/setup'
import type { IDatePicker } from '@soldy-ui/core'
import { SoldyElement, defineElement } from '../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../adapter'
import { datePickerTemplate } from './date-picker.template'
import { setupDatePicker } from './setup.component'

export const TDatePickerElement = SoldyElement(HTMLDivElement, {
	descriptor: DatePickerDescriptor(),
	template: datePickerTemplate,
	root: { aria: 'rootAria' },
	setup: setupDatePicker,
})

defineElement('so-date-picker', TDatePickerElement, 'div')

/**
 * `<div is="so-date-picker">` из JS: нативный `div`, своё элемента soldy
 * (`ctrl`, `state`) и свойства пропов дескриптора вместе с пропсами его
 * плагинов (`aria_label`, `dismiss_enabled`) — без тех, что у `div` уже есть
 * (`id` — `id` корня), и без `HOST_PROPS` (`TSoldyElementProps`).
 */
export type TDatePickerElementProps = HTMLDivElement &
	ISoldyElement<IDatePicker> &
	TSoldyElementProps<typeof DatePickerDescriptor, HTMLDivElement>
