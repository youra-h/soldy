/**
 * TDragAndDropCollectionExtension — активирует TDragPlugin на коллекции в drag-контексте.
 *
 * Drag-контекст опускает родитель через TDragAndDropExtension.
 *
 * Использование:
 *   adapter.use(TCollectionExtension, { elevator: VueElevatorFactory })
 *     .use(TDragAndDropCollectionExtension, { elevator: VueElevatorFactory })
 */

import { TDragPlugin } from '@soldy/plugins'
import type { TInstanceContext } from '../../../protected/adapter/context'
import { DRAG_CONTEXT_ELEVATOR } from '../../../protected/adapter/elevator/keys'
import type { TCollectionOwner } from '../collection'
import type { IDragAndDropCollectionExtensionOptions } from './types'

export class TDragAndDropCollectionExtension {
	constructor(
		context: TInstanceContext<TCollectionOwner>,
		options: IDragAndDropCollectionExtensionOptions,
	) {
		const { elevator } = options

		const dragContext = elevator(DRAG_CONTEXT_ELEVATOR).up()

		if (!dragContext) return

		context.bundle?.get(TDragPlugin)?.activate(context.instance.engine)
	}
}
