import { type Ref } from 'vue'
import type { IAdapterContext } from '@soldy/setup'
import { TCollectionFactoryExtension } from '@soldy/setup'
import { TDescriptorInspector } from '@soldy/accessor'
import { VueNaming } from '../common/naming'
import { useSyncProps } from './useSyncProps'

/**
 * useVueCollection — реактивный хук для коллекции (родительский компонент).
 * Возвращает { collection, ...refs } где refs = реактивные свойства коллекции (items, activeItem...).
 */
export function useVueCollection(
	adapter: IAdapterContext,
	props: Record<string, any>,
): { collection: any } & Record<string, Ref<any>> {
	const factory = adapter.get(TCollectionFactoryExtension)

	if (!factory?.collection) return { collection: undefined } as any

	const collectionAccessor = factory.descriptor.createAccessor(factory.collection)
	const inspector = new TDescriptorInspector(collectionAccessor, VueNaming)

	const { refs, bindOutput, bindInput } = useSyncProps(collectionAccessor, inspector)

	bindOutput()

	// Отслеживаем изменения входных (не protected) пропсов коллекции (items, trackBy, ...).
	// Инициализация уже выполнена TCollectionPropsExtension — здесь только реактивные изменения.
	bindInput(props)

	return { collection: factory.collection, ...refs } as any
}
