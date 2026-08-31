/**
 * TCollectionItemExtension — единая точка входа для настройки элемента коллекции.
 *
 * Два режима:
 *  1. Фасад (facade + itemDescriptor) — Tabs/Collapse после рефакторинга.
 *  2. Legacy (descriptor) — List/ListBox.
 *
 * В обоих режимах выполняется регистрация элемента в родительской коллекции.
 */

import { TItemContextRegistry } from '@soldy/core'
import type { IAdapterContext } from '../../context'
import type { TElevatorFactory } from '../../elevator'
import { COLLECTION_ELEVATOR, ITEM_CONTEXT_ELEVATOR } from '../../elevator/keys'
import { TCollectionItemContextExtension } from './collection-item-context.extension.class'
import { TCollectionItemMetaExtension } from './collection-item-meta.extension.class'
import { collectItemProps } from '../../../descriptors/base/collect-props'
import type { ICollectionDescriptor, IComponentDescriptor } from '@soldy/setup'

export interface ICollectionItemExtensionOptions {
	/** Legacy-режим: дескриптор коллекции (defineCollection). */
	descriptor?: ICollectionDescriptor
	/** Фасад-режим: item-фасад, которому передаётся TItemContext. */
	facade?: any
	/** Фасад-режим: item-дескриптор коллекции (defineComponent) для сбора meta. */
	itemDescriptor?: IComponentDescriptor
	elevator: TElevatorFactory
}

export class TCollectionItemExtension {
	constructor(context: IAdapterContext, options: ICollectionItemExtensionOptions) {
		const { descriptor, facade, itemDescriptor, elevator } = options

		if (facade) {
			// Фасад-режим: контекст из коллекции-владельца, meta из item-пропсов.
			const collection = elevator(ITEM_CONTEXT_ELEVATOR).up() as any

			if (collection) {
				const registry = new TItemContextRegistry(collection.getCore())
				facade.setContext(registry.get(context.instance))
			}

			this._register(context, elevator)

			if (itemDescriptor && collection?.extensions?.meta) {
				const meta = collectItemProps(itemDescriptor.props, context.props)
				collection.extensions.meta.apply(context.instance, meta)
			}

			return
		}

		// Legacy-режим: порядок как раньше (контекст → регистрация → meta).
		if (descriptor) {
			context.use(TCollectionItemContextExtension, { descriptor, elevator })
		}

		this._register(context, elevator)

		if (descriptor) {
			context.use(TCollectionItemMetaExtension, { descriptor, elevator })
		}
	}

	private _register(context: IAdapterContext, elevator: TElevatorFactory): void {
		const itemElevator = elevator(COLLECTION_ELEVATOR)

		const register = itemElevator.up() as
			| ((item: any, bundle: any) => () => void)
			| undefined

		if (register) {
			const cleanup = register(context.instance, context.bundle)

			context.events.on('destroy', cleanup)
		}
	}
}
