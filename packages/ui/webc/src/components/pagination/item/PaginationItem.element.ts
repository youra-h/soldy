/**
 * `<li is="so-pagination-item">` — страница пагинации: место в списке, внутри
 * строка — Button с номером или текстом страницы.
 *
 * Внутренняя часть, как тост у Toasts: страницы окна кладёт в коллекцию сама
 * пагинация и рисует их своим шаблоном, по одной на каждую страницу окна, —
 * потребитель их в разметку не ставит, и класс элемента из пакета не выходит.
 * Страница — разметка пагинации (`createItem`), и её события не всплывают:
 * их слышно на самой странице, а нажатую пагинация сообщает `so:change:value`.
 *
 * Элемент — настоящий `<li>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. На корне из наборов
 * ядра — `attrs` и `dataset` (`data-selected`, `data-disabled`), а `aria`
 * страницы — `aria-current` текущей — шаблон кладёт на строку. Поля в корне
 * нет: ставит страницу только владелец, и своих атрибутов у него для неё нет.
 * Регистрирует элемент модуль пагинации (`Pagination.element.ts`), после
 * себя.
 *
 * Разметка вынесена в pagination-item.template.ts, жизненный цикл — в
 * ElementBase.
 */

import { PaginationCollectionItemDescriptor, PaginationItemDescriptor } from '@soldy-ui/setup'
import type { IPaginationItem, TPaginationItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { IElementBase, TElementProps } from '../../../adapter'
import { paginationItemTemplate } from './pagination-item.template'
import { setupPaginationItem } from './setup.component'

export const TPaginationItemElement = ElementBase(HTMLLIElement, {
	descriptor: PaginationItemDescriptor(),
	facade: PaginationCollectionItemDescriptor(),
	template: paginationItemTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'] },
	setup: setupPaginationItem,
})

/**
 * `<li is="so-pagination-item">` из JS: нативный `li`, своё элемента soldy
 * (`ctrl`, `state` — вместе со свойствами фасада) и свойства пропов
 * дескриптора — без тех, что у `li` уже есть, и без `HOST_PROPS`
 * (`TElementProps`). Входов у страницы нет: всё ей пишет пагинация.
 */
export type TPaginationItemElementProps = HTMLLIElement &
	IElementBase<IPaginationItem, TPaginationItemCollectionFacade> &
	TElementProps<typeof PaginationItemDescriptor, HTMLLIElement>
