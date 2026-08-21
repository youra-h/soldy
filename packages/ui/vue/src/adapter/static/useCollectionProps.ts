import { TDescriptorInspector } from '@soldy/accessor'
import type { ICollectionDescriptor } from '@soldy/setup'
import { VueNaming } from '../common/naming'

function resolveVueType(rawType: any) {
	if (!rawType) return undefined
	if (typeof rawType === 'object' && rawType.ctor) return rawType.ctor
	return rawType
}

/** Генерирует Vue props config из collection-level props (родительский компонент). */
export function useCollectionProps(descriptor: ICollectionDescriptor): Record<string, any> {
	const inspector = new TDescriptorInspector(
		descriptor.parentProps,
		descriptor.parentEvents,
		VueNaming,
	)
	const rawProps = inspector.getExportProps({})
	const vueProps: Record<string, any> = {}
	for (const [key, config] of Object.entries(rawProps)) {
		vueProps[key] = {
			...config,
			...(config.type !== undefined ? { type: resolveVueType(config.type) } : {}),
		}
	}
	return vueProps
}

/** Генерирует Vue props config из item-level props (дочерний компонент). */
export function useCollectionItemProps(descriptor: ICollectionDescriptor): Record<string, any> {
	const inspector = new TDescriptorInspector(
		descriptor.itemProps,
		descriptor.itemEvents,
		VueNaming,
	)
	const rawProps = inspector.getExportProps({})
	const vueProps: Record<string, any> = {}
	for (const [key, config] of Object.entries(rawProps)) {
		vueProps[key] = {
			...config,
			...(config.type !== undefined ? { type: resolveVueType(config.type) } : {}),
		}
	}
	return vueProps
}
