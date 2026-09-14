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
import type { TCollectionOwner } from './collection.extension.class'

export interface IDragAndDropCollectionExtensionOptions {
	elevator: TElevatorFactory
}

export class TDragAndDropCollectionExtension {
	constructor(
		context: IAdapterContext<TCollectionOwner>,
		options: IDragAndDropCollectionExtensionOptions,
	) {
		const { elevator } = options

		const dragContext = elevator(DRAG_CONTEXT_ELEVATOR).up()

		if (!dragContext) return

		context.bundle?.get(TDragPlugin)?.activate(context.instance.engine)
	}
}
