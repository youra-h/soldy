import { onUnmounted, type Ref } from 'vue'
import type { IAdapterContext } from '@soldy/setup'
import { TCollectionFactoryExtension } from '@soldy/setup'
import { createInspector } from '../common'
import { useSyncProps } from './useSyncProps'

/**
 * useVueCollection — реактивный хук для коллекции (родительский компонент).
 *
 * Возвращает { collection, ...refs } где refs — реактивные Ref для collection-level props
 * (items, _activeItem и др.) на основе ICollectionDescriptor.schema.parentProps.
 */
export function useVueCollection<
	TItem = any,
	TExtensions extends Record<string, any> = any,
>(
	adapter: IAdapterContext,
): { collection: any } & Record<string, Ref<any>> {
	const factory = adapter.get(TCollectionFactoryExtension)

	if (!factory?.collection) {
		return { collection: undefined } as any
	}

	const collectionAccessor = factory.descriptor.createAccessor(factory.collection)
	const inspector = createInspector(collectionAccessor)

	const { refs, bindOutput, bindInput } = useSyncProps(collectionAccessor, inspector)

	// Выход: Core → Vue (реактивные refs collection state)
	bindOutput()

	return {
		collection: factory.collection,
		...refs,
	} as { collection: any } & Record<string, Ref<any>>
}
