import { TDescriptorInspector } from '@soldy/accessor'
import type { ICollectionDescriptor } from '@soldy/setup'
import { VueNaming } from '../common/naming'

/** Генерирует Vue emits array из collection-level events (родительский компонент). */
export function useCollectionEmits(descriptor: ICollectionDescriptor): string[] {
	return new TDescriptorInspector(
		{ props: descriptor.schema.parentProps, events: descriptor.schema.parentEvents },
		VueNaming,
	).getExportEvents()
}

/** Генерирует Vue emits array из item-level events (дочерний компонент). */
export function useCollectionItemEmits(descriptor: ICollectionDescriptor): string[] {
	return new TDescriptorInspector(
		{ props: descriptor.schema.itemProps, events: descriptor.schema.itemEvents },
		VueNaming,
	).getExportEvents()
}
