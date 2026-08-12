/**
 * createCollectionContext — создаёт контекст жизненного цикла коллекции.
 *
 * Аналог createAdapterContext, но для коллекций:
 * - factory создаёт TCollection (вместо new ctor)
 * - TCollectionAccessor (вместо TComponentAccessor)
 *
 * Использование:
 *   const colCtx = createCollectionContext(TabsCollectionDescriptor, tabsInstance)
 *       .use(TCollectionItemElevatorExtension, { elevator: VueElevatorFactory })
 */

import { TEvented } from '@soldy/core'
import { TCollectionAccessor } from '@soldy/accessor'
import type { ICollectionDescriptor } from '../../collection'
import type {
	ICollectionAdapterContext,
	TCollectionAdapterEvents,
	ICollectionAdapterExtensionCtor,
} from './types'

export function createCollectionContext<TItem extends object = any>(
	descriptor: ICollectionDescriptor<TItem>,
	owner: any,
): ICollectionAdapterContext {
	const collection = descriptor.factory(owner)
	const accessor = new TCollectionAccessor(descriptor.props, descriptor.events, collection)

	const events = new TEvented<TCollectionAdapterEvents>()
	const extensionsMap = new Map<symbol, any>()

	const ctx: ICollectionAdapterContext = {
		collection,
		accessor,
		events,

		use(ExtensionCtor: any, opts?: any) {
			const ext = new ExtensionCtor(this, opts)
			extensionsMap.set(ExtensionCtor.key, ext)
			return this
		},

		get(ctorOrKey: any) {
			const key = typeof ctorOrKey === 'symbol' ? ctorOrKey : ctorOrKey.key
			return extensionsMap.get(key)
		},

		destroy() {
			events.emit('destroy')
			extensionsMap.clear()
		},
	}

	return ctx
}
