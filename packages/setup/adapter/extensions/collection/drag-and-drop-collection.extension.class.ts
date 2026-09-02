/**
 * TDragAndDropCollectionExtension — активирует TDragPlugin на коллекции,
 * если родитель установил drag-контекст через TDragAndDropExtension.
 *
 * Использование:
 *   adapter.use(TCollectionExtension, { elevator: VueElevatorFactory })
 *     .use(TDragAndDropCollectionExtension, { elevator: VueElevatorFactory })
 */

import { TDragPlugin } from '@soldy/plugins'
import type { IAdapterContext } from '../../context'
import type { TElevatorFactory } from '../../elevator'
import { DRAG_CONTEXT_ELEVATOR } from '../../elevator/keys'

export interface IDragAndDropCollectionExtensionOptions {
	elevator: TElevatorFactory
}

export class TDragAndDropCollectionExtension {
	constructor(context: IAdapterContext, options: IDragAndDropCollectionExtensionOptions) {
		const { elevator } = options
		const { bundle } = context

		const dragElevator = elevator<boolean>(DRAG_CONTEXT_ELEVATOR)
		const dragContext = dragElevator.up()

		if (!dragContext) return

		const engine = (context.instance as any)?.engine

		if (engine) {
			bundle.get(TDragPlugin)?.activate(engine)
		}
	}
}
