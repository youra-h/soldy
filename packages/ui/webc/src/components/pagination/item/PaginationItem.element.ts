/**
 * `<li is="so-pagination-item">` — страница пагинации: место в списке, внутри
 * строка — Button с номером или текстом страницы.
 *
 * Внутренняя часть, как тост у Toasts: страницы окна кладёт в коллекцию сама
 * пагинация и рисует их своим шаблоном, по одной на каждую страницу окна, —
 * потребитель их в разметку не ставит, и класс элемента из пакета не выходит.
 *
 * Элемент — настоящий `<li>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию. На корне из наборов
 * ядра — `attrs` и `dataset` (`data-selected`, `data-disabled`), а `aria`
 * страницы — `aria-current` текущей — шаблон кладёт на строку. Поля в корне
 * нет: ставит страницу только владелец, и своих атрибутов у него для неё нет.
 * Регистрирует элемент модуль пагинации (`Pagination.element.ts`), после
 * себя.
 *
 * Разметка вынесена в pagination-item.template.ts, жизненный цикл — в
 * SoldyElement.
 */

import { PaginationCollectionItemDescriptor, PaginationItemDescriptor } from '@soldy-ui/setup'
import type { IPaginationItem, TPaginationItemCollectionFacade } from '@soldy-ui/core'
import { SoldyElement } from '../../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../../adapter'
import { paginationItemTemplate } from './pagination-item.template'
import { setupPaginationItem } from './setup.component'

export const TPaginationItemElement = SoldyElement(HTMLLIElement, {
	descriptor: PaginationItemDescriptor(),
	facade: PaginationCollectionItemDescriptor(),
	template: paginationItemTemplate,
	root: { sets: ['attrs', 'dataset'] },
	setup: setupPaginationItem,
})

/**
 * `<li is="so-pagination-item">` из JS: нативный `li`, своё элемента soldy
 * (`ctrl`, `state` — вместе со свойствами фасада) и свойства пропов
 * дескриптора — без тех, что у `li` уже есть, и без `HOST_PROPS`
 * (`TSoldyElementProps`). Входов у страницы нет: всё ей пишет пагинация.
 */
export type TPaginationItemElementProps = HTMLLIElement &
	ISoldyElement<IPaginationItem, TPaginationItemCollectionFacade> &
	TSoldyElementProps<typeof PaginationItemDescriptor, HTMLLIElement>
