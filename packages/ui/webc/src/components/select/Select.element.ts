/**
 * `<div is="so-select">` — поле выбора из списка: поле и список в панели,
 * паттерн Combobox.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Корень — рамка поля и
 * якорь панели: на нём из наборов ядра `attrs` и `dataset` (`data-open`), а
 * набор `aria` Select шаблон кладёт на поле. Поле — деталь Input в корне, поле
 * корня (`control`): статические атрибуты разметки, кроме `class`, `style`,
 * `is`, `slot` и входов пропов, база при построении переносит на неё, а с неё
 * — на `<input>`: `aria-label`, `autocomplete` и `data-*` потребителя стоят
 * на комбобоксе. `id` — проп поля: атрибут разметки база берёт пропом первой
 * сборки, а до `<input>` его доводит экземпляр поля; из кода — `ctrl.id`.
 *
 * Опции — свет Select в слоте по умолчанию: `<div is="so-select-item">` и
 * группы `<div is="so-select-group">`, — или данные (`el.items`, `el.engine`).
 * Панель с ними — деталь Frame: в `body` её уводит база самого Frame, а опции
 * входят в коллекцию Select лифтом от её якоря.
 *
 * Контекстов два — свой и фасада коллекции (`setupSelect`), и пропсы фасада
 * (`items`, `mode`, `engine`, `trackBy`, `groups`, `groupBy`, `tags_overflow`)
 * — атрибуты-входы и свойства того же элемента: дескриптор фасада элемент
 * называет рядом со своим.
 *
 * Модуль регистрирует и части — группу и опцию. Разметку, ожившую при
 * регистрации, база собирает по месту (`deferral.ts`): Select и группа —
 * раньше опций под ними, в каком бы порядке ни регистрировались части. Строку
 * опции — Button на `span` (`<span is="so-button-span">`) — регистрирует
 * фабрика кнопки там, где она впервые нужна, — модуль шаблона опции.
 *
 * Разметка вынесена в select.template.ts, жизненный цикл — в ElementBase.
 */

import { SelectCollectionDescriptor, SelectDescriptor } from '@soldy-ui/setup'
import type { ISelect, TSelectCollectionFacade } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { IElementBase, TElementProps } from '../../adapter'
import { TSelectGroupElement } from './group'
import { TSelectItemElement } from './item'
import { selectTemplate } from './select.template'
import { setupSelect } from './setup.component'

export const TSelectElement = ElementBase(HTMLDivElement, {
	descriptor: SelectDescriptor(),
	facade: SelectCollectionDescriptor(),
	template: selectTemplate,
	root: { sets: ['attrs', 'dataset'], control: true },
	setup: setupSelect,
})

defineElement('so-select', TSelectElement, 'div')
defineElement('so-select-group', TSelectGroupElement, 'div')
defineElement('so-select-item', TSelectItemElement, 'div')

/**
 * `<div is="so-select">` из JS: нативный `div`, своё элемента soldy (`ctrl`,
 * `state` — вместе со свойствами фасада) и свойства пропов дескриптора вместе
 * с пропсами его плагинов и фасада (`items`, `mode`, `engine`) — без тех, что у
 * `div` уже есть (`id` — собственный `id` корня), и без `HOST_PROPS`
 * (`TElementProps`).
 */
export type TSelectElementProps = HTMLDivElement &
	IElementBase<ISelect, TSelectCollectionFacade> &
	TElementProps<typeof SelectDescriptor, HTMLDivElement>
