import type { IBatchExtension } from './batch/types'
import type { IDrawExtension, TDrawable } from './draw/types'
import type { IExtension } from './types'

/**
 * Соседи по коллекции — по контракту, а не приведением типа.
 *
 * Контекст расширения знает соседей только как `IExtension`, а движок,
 * пришедший к плагину или расширению адаптера, — как `TCollectionEngine<any,
 * any>`. Поэтому соседа узнают проверкой его контракта: так расширения не
 * замыкают друг на друга циклом модулей, а снаружи нечего приводить.
 */

/** Где искать соседа: контекст расширения или сам движок. */
type TNeighbours<TItem extends object> = {
	readonly extensions: Readonly<Record<string, IExtension<TItem> | undefined>>
}

function isBatch<TItem extends object>(ext: IExtension<TItem>): ext is IBatchExtension<TItem> {
	return 'shown' in ext && 'items' in ext && 'patch' in ext
}

function isDraw<TItem extends TDrawable>(ext: IExtension<TItem>): ext is IDrawExtension<TItem> {
	return 'drawn' in ext && 'pin' in ext && 'useStrategy' in ext && 'notifyViewport' in ext
}

/** Состав коллекции, если он есть: его выборка — показанные элементы. */
export function batchOf<TItem extends object>(
	neighbours: TNeighbours<TItem> | null | undefined,
): IBatchExtension<TItem> | undefined {
	const ext = neighbours?.extensions.batch

	return ext && isBatch(ext) ? ext : undefined
}

/** Рисование коллекции, если оно есть: что рисовать из показанных и окно. */
export function drawOf<TItem extends TDrawable>(
	neighbours: TNeighbours<TItem> | null | undefined,
): IDrawExtension<TItem> | undefined {
	const ext = neighbours?.extensions.draw

	return ext && isDraw(ext) ? ext : undefined
}
