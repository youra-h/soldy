import type { TNeighbours } from '../../../../base/collection/engine/extension/neighbours'
import type { IMenuExtension } from './menu/types'

/**
 * Соседи по коллекции меню.
 *
 * Плагины меню опираются на соседа, которого нет у других коллекций: нажатие
 * пунктов и открытое подменю (`menu`) — указатель открывает подменю
 * наведением через него. Его узнают проверкой контракта, а не приведением
 * типа, как стандартных соседей (`neighbours.ts` движка).
 *
 * Искать можно в любой коллекции — у чужой охранник отдаёт `undefined`,
 * поэтому тип её элементов не важен, а контракт — меню.
 */

function isMenu(ext: object): ext is IMenuExtension {
	return 'chooseItem' in ext && 'toggleItem' in ext && 'openItem' in ext && 'opened' in ext
}

/** Расширение меню, если оно есть в коллекции: нажатие пунктов и открытое подменю. */
export function menuOf<TItem extends object>(
	neighbours: TNeighbours<TItem> | null | undefined,
): IMenuExtension | undefined {
	const ext = neighbours?.extensions.menu

	return ext && isMenu(ext) ? ext : undefined
}
