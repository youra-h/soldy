import { watch, type Ref } from 'vue'
import type { IAdapterContext } from '@soldy/setup'
import { TCollectionFactoryExtension, TCollectionItemContextExtension } from '@soldy/setup'
import { createInspector } from '../common'
import { useSyncProps } from './useSyncProps'

/**
 * useVueCollectionItem — реактивный хук для элемента коллекции (дочерний компонент).
 *
 * Возвращает { context, ...refs } где refs — реактивные Ref для item-level props
 * (active, _order, _closable и др.) на основе ICollectionDescriptor.schema.itemProps.
 */
export function useVueCollectionItem<
	TItem = any,
	TExtensions extends Record<string, any> = any,
>(
	adapter: IAdapterContext,
): { context: any } & Record<string, Ref<any>> {
	const contextExt = adapter.get(TCollectionItemContextExtension) as TCollectionItemContextExtension<TItem, TExtensions> | undefined
	const factory = adapter.get(TCollectionFactoryExtension)

	const context = contextExt?.context

	if (!context || !factory) {
		return { context: undefined } as any
	}

	const itemAccessor = factory.descriptor.createItemAccessor(context)
	const inspector = createInspector(itemAccessor)

	const { refs, bindOutput } = useSyncProps(itemAccessor, inspector)

	// Выход: адаптеры item → Vue (реактивные refs: active, _order, _closable)
	bindOutput()

	return {
		context,
		...refs,
	} as { context: any } & Record<string, Ref<any>>
}
