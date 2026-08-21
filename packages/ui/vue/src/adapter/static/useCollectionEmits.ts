import { TDescriptorInspector } from '@soldy/accessor'
import type { ICollectionDescriptor } from '@soldy/setup'
import { VueNaming } from '../common/naming'

/** Генерирует Vue emits array из collection-level events. */
export function useCollectionEmits(descriptor: ICollectionDescriptor): string[] {
	return new TDescriptorInspector(
		descriptor.parentProps,
		descriptor.parentEvents,
		VueNaming,
	).getExportEvents()
}

/** Генерирует Vue emits array из item-level events. */
export function useCollectionItemEmits(descriptor: ICollectionDescriptor): string[] {
	return new TDescriptorInspector(
		descriptor.itemProps,
		descriptor.itemEvents,
		VueNaming,
	).getExportEvents()
}
