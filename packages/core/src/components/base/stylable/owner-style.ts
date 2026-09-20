import type { TComponentSize, TComponentVariant } from '../../../common'
import type { IStyledItem, IStyleOwner } from './types'

/**
 * Размер и вид элемента, которым владеет компонент (список, набор табов):
 * их диктует владелец — как его ни наполняй, у элемента тот же `size` и тот
 * же `variant`. Правило одно на все коллекции и живёт только здесь;
 * расширения `item.size`/`item.variant` не пишут.
 *
 * Своё значение элемента не пропадает и не копируется: оно лежит в `rawValue`,
 * куда его пишут фабрика, разметка и `batch.patch` через сеттер, — но на вид
 * не влияет. Итог отдаёт резольвер, поэтому всё, что читает `item.size` и
 * `item.variant` — классы, тема, `getProps`, — получает значение владельца.
 *
 * Раньше расширение писало элементу значение владельца при добавлении и на
 * каждую его смену. Список, собранный данными (`items`), терял собственные
 * размер и вид элемента сразу, а объявленный разметкой — на первой же смене у
 * списка: поведение зависело от способа наполнения.
 *
 * О коллекции модуль не знает — элементы передаёт расширение.
 */

/**
 * Привязать `size` и `variant` элемента к владельцу.
 *
 * Зовётся на каждом добавлении, в том числе повторно для того же элемента:
 * резольвер заменяется, а `change` приходит, только если итог сменился. На
 * нём же держится первая простановка классов элемента, добавленного в список
 * другого размера.
 */
export function bindStyleToOwner(item: IStyledItem, owner: IStyleOwner): void {
	item.states.size.setResolver(() => owner.size)
	item.states.variant.setResolver(() => owner.variant)
}

/**
 * Владелец сменил `size` — сообщить элементам.
 *
 * `oldValue` — прежний размер владельца, он же прежний итог каждого элемента.
 * Без него элемент получил бы `oldValue === newValue` и остался бы с двумя
 * классами `--size-*`: старый снимается по нему.
 */
export function notifyOwnerSize(items: Iterable<IStyledItem>, oldValue: TComponentSize): void {
	for (const item of items) item.states.size.notify(oldValue)
}

/** Владелец сменил `variant` — сообщить элементам. См. `notifyOwnerSize`. */
export function notifyOwnerVariant(
	items: Iterable<IStyledItem>,
	oldValue: TComponentVariant | undefined,
): void {
	for (const item of items) item.states.variant.notify(oldValue)
}
