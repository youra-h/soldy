/**
 * TDragAndDropExtension — опускает флаг drag-контекста вниз детям.
 *
 * TCollectionExtension в дочерней коллекции поймает его через dragElevator.up()
 * и активирует TDragPlugin.
 *
 * Использование:
 *   adapter.use(TDragAndDropExtension, { elevator: VueElevatorFactory })
 */

import { DRAG_CONTEXT_ELEVATOR } from '../elevator/keys'
import type { IAdapterContext } from '../context'
import type { TElevatorFactory } from '../elevator'

export interface IDragAndDropExtensionOptions {
	elevator: TElevatorFactory
}

export class TDragAndDropExtension {
	static readonly key = Symbol('TDragAndDropExtension')

	constructor(context: IAdapterContext, options: IDragAndDropExtensionOptions) {
		const { elevator } = options

		const dragElevator = elevator<boolean>(DRAG_CONTEXT_ELEVATOR)
		// Опускаем флаг drag-контекста вниз детям
		dragElevator.down(true)
	}
}
