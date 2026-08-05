/**
 * TCollectionItemExtension — регистрирует элемент в родительской коллекции
 * через elevator (толкает себя наверх).
 *
 * Использование:
 *   adapter.use(TCollectionItemExtension, { elevator: vueElevatorFactory })
 */

import type { IAdapterContext } from '../context'
import type { TElevatorFactory } from '../elevator'
import { COLLECTION_ELEVATOR } from '../elevator/keys'

export interface ICollectionItemExtensionOptions {
	elevator: TElevatorFactory
}

export class TCollectionItemExtension {
	static readonly key = Symbol('TCollectionItemExtension')

	constructor(context: IAdapterContext, options: ICollectionItemExtensionOptions) {
		const { elevator } = options
		const itemElevator = elevator(COLLECTION_ELEVATOR)

		const register = itemElevator.up() as
			| ((payload: { instance: any; bundle: any }) => () => void)
			| undefined

		if (!register) return

		const { instance, bundle } = context

		const cleanup = register({ instance, bundle })

		context.events.on('destroy', cleanup)
	}
}
