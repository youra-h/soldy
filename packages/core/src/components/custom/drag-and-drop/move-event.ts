import { TActionEvent } from '../../../common'
import type { TCollectionEngine } from '../../base/collection'
import type { IDragAndDropMove } from './types'

/**
 * Перестановка жестом, которую ещё можно отменить, — аргумент `move:before`
 * обёртки `DragAndDrop`.
 *
 * `preventDefault()` оставляет элемент на месте. Место только для чтения:
 * подменить его — хук движка `item:move:before` (`TMoveEvent.newIndex`), он
 * видит любое перемещение, и из кода тоже.
 */
export class TDragAndDropMoveEvent extends TActionEvent implements IDragAndDropMove {
	constructor(
		readonly engine: TCollectionEngine<any, any>,
		readonly item: object,
		readonly oldIndex: number,
		readonly newIndex: number,
	) {
		super()
	}
}
