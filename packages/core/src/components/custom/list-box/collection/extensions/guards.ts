import type { TNeighbours } from '../../../../base/collection/engine/extension/neighbours'
import type { IListBoxExtension } from './list-box/types'

/**
 * Соседи по коллекции ListBox.
 *
 * Клавиатура списка выбирает элемент через расширение списка (`list`) — тем
 * же путём, что клик по строке: выключенному элементу оно отказывает. Движок
 * приходит к плагину без типа, поэтому расширение узнают проверкой контракта,
 * а не чтением наугад, как стандартных соседей (`neighbours.ts` движка).
 *
 * Искать можно в любой коллекции — у чужой охранник отдаёт `undefined`,
 * поэтому тип её элементов не важен, а контракт — ListBox'а.
 */

/** `chooseItem` и `indicator` есть и у Select, `chooseItem` — и у меню: вид — только у списка. */
function isList(ext: object): ext is IListBoxExtension {
	return 'chooseItem' in ext && 'view' in ext && 'indicator' in ext
}

/** Расширение списка, если оно есть в коллекции: выбор пользователя и свойства списка. */
export function listOf<TItem extends object>(
	neighbours: TNeighbours<TItem> | null | undefined,
): IListBoxExtension | undefined {
	const ext = neighbours?.extensions.list

	return ext && isList(ext) ? ext : undefined
}
