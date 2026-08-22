import { type Ref } from 'vue'
import type { IAdapterContext } from '@soldy/setup'
import { TCollectionItemContextExtension } from '@soldy/setup'
import { TDescriptorInspector } from '@soldy/accessor'
import { VueNaming } from '../common/naming'
import { useSyncProps } from './useSyncProps'

/**
 * useVueCollectionItem — реактивный хук для элемента коллекции (дочерний компонент).
 * Возвращает { context, ...refs } где refs = реактивные свойства item (active, order, closable...).
 *
 * descriptor берётся из TCollectionItemContextExtension, куда он передан через .use(Ctor, { descriptor }).
 */
export function useVueCollectionItem<TItem = any, TExtensions = any>(
	adapter: IAdapterContext,
): { context: any } & Record<string, Ref<any>> {
	const contextExt = adapter.get(TCollectionItemContextExtension) as any

	const context = contextExt?.context
	const descriptor = contextExt?.descriptor

	if (!context || !descriptor) return { context: undefined } as any

	const itemAccessor = descriptor.createItemAccessor(context)
	const inspector = new TDescriptorInspector(itemAccessor, VueNaming)

	const { refs, bindOutput } = useSyncProps(itemAccessor, inspector)
	bindOutput()

	return { context, ...refs } as any
}
