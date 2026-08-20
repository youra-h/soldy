/**
 * TCollectionFactoryExtension — создает фабрику коллекций, которая позволяет создавать коллекции с определенными параметрами и поведением.
 */

import { TCollectionPlugin, TCollectionItemPlugins } from '@soldy/plugins'
import type { IAdapterContext } from '../../context'
import type { TElevatorFactory } from '../../elevator'
import { COLLECTION_ELEVATOR } from '../../elevator/keys'

export interface ICollectionFactoryExtensionOptions {
	descriptor: ICollectionDescriptor
}

export class TCollectionFactoryExtension {
	static readonly key = Symbol('TCollectionFactoryExtension')

	constructor(context: IAdapterContext, options: ICollectionFactoryExtensionOptions) {
		const { descriptor } = options
	}
}
