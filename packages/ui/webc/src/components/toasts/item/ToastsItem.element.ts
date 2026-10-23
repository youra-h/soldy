/**
 * `<li is="so-toasts-item">` — тост: место в списке региона, внутри — плашка
 * со значком, текстом, своим содержимым и крестиком.
 *
 * Внутренняя часть, как страница пагинации: тосты приходят из кода (`show`),
 * их кладёт в коллекцию очередь менеджера и рисует его регион, по одному на
 * каждый показанный, — потребитель их в разметку не ставит, и класс элемента
 * из пакета не выходит. Регистрирует элемент модуль менеджера
 * (`Toasts.element.ts`). Тост — разметка менеджера (`createItem`), и его
 * события не всплывают: их слышно на самом тосте, а закрытый менеджер
 * сообщает `so:item:close`.
 *
 * Элемент — настоящий `<li>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. На корне — все три
 * набора ядра, как у Vue: роль живой области, `tabindex`, `data-open`,
 * `data-swiping`. Классы, наборы и скрытие корня раскладывает база.
 *
 * Разметка вынесена в toasts-item.template.ts, жизненный цикл — в
 * ElementBase.
 */

import { ToastsCollectionItemDescriptor, ToastsItemDescriptor } from '@soldy-ui/setup'
import type { IToastsItem, TToastsItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { IElementBase, TElementProps } from '../../../adapter'
import { setupToastsItem } from './setup.component'
import { toastsItemTemplate } from './toasts-item.template'

export const TToastsItemElement = ElementBase(HTMLLIElement, {
	descriptor: ToastsItemDescriptor(),
	facade: ToastsCollectionItemDescriptor(),
	template: toastsItemTemplate,
	setup: setupToastsItem,
})

/**
 * `<li is="so-toasts-item">` из JS: нативный `li`, своё элемента soldy
 * (`ctrl`, `state` — вместе со свойствами фасада) и свойства пропов
 * дескриптора — без тех, что у `li` уже есть, и без `HOST_PROPS`
 * (`TElementProps`). Входов у тоста нет: тост ему отдаёт регион.
 */
export type TToastsItemElementProps = HTMLLIElement &
	IElementBase<IToastsItem, TToastsItemCollectionFacade> &
	TElementProps<typeof ToastsItemDescriptor, HTMLLIElement>
