/**
 * `<label is="so-radio-group-item">` — радио: корень — подпись, внутри
 * нативный `<input type="radio">`, кольцо с точкой и текст подписи.
 *
 * Элемент — настоящий `<label>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Корень обязан быть
 * подписью — клик по тексту выбирает радио, а подпись становится его
 * доступным именем, — поэтому радио пишется только на `label`: одно имя
 * элемента расширяет один тег, и радио в подписи `Label` (`tag="span"` у
 * остальных адаптеров) у Web Components нет — `label` в `label` HTML
 * запрещает.
 *
 * Корень с полем (`control` в описании корня): на корне из наборов ядра
 * `attrs` (`dir`) и `dataset` (`data-selected`, `data-disabled` — по ним тема
 * красит радио), `aria` — на поле, его кладёт шаблон. Статические атрибуты
 * разметки, кроме `class`, `style`, `is`, `slot` и входов пропов, база при
 * построении переносит на поле: `id` для `<label for>` снаружи, `aria-label`,
 * `data-*`. Места в коллекции на корне нет: радио одной группы стоят где
 * угодно, и номер увёл бы радио по чужому флекс-ряду, — как у Vue и Angular.
 *
 * Пропсы фасада — `active` — тоже атрибут-вход и свойство элемента: дескриптор
 * фасада элемент называет рядом со своим. Регистрирует элемент модуль группы
 * (`RadioGroup.element.ts`).
 *
 * Разметка вынесена в radio-group-item.template.ts, жизненный цикл — в
 * ElementBase.
 */

import { RadioGroupCollectionItemDescriptor, RadioGroupItemDescriptor } from '@soldy-ui/setup'
import { ElementBase } from '../../../adapter'
import type { TElementType } from '../../../adapter'
import { radioGroupItemTemplate } from './radio-group-item.template'
import { setupRadioGroupItem } from './setup.component'

export const TRadioGroupItemElement = ElementBase(HTMLLabelElement, {
	descriptor: RadioGroupItemDescriptor,
	facade: RadioGroupCollectionItemDescriptor,
	template: radioGroupItemTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], control: true },
	setup: setupRadioGroupItem,
})

/**
 * `<label is="so-radio-group-item">` из JS: нативный `label`, своё элемента
 * soldy (`ctrl`, `state` — вместе со свойствами фасада) и свойства пропов
 * дескриптора вместе с пропсами его плагинов и фасада (`active`) — без тех,
 * что у `label` уже есть, и без `HOST_PROPS` (`TElementProps`).
 */
export type TRadioGroupItemElementProps = TElementType<typeof TRadioGroupItemElement>
