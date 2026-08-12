import type { PropType } from 'vue'
import type { ICollectionItemDescriptor } from '@soldy/setup'
import { createInspector } from '../common'

function resolveVueType(rawType: any): PropType<any> | undefined {
	if (!rawType) return undefined
	if (typeof rawType === 'object' && rawType.ctor) return rawType.ctor as PropType<any>
	return rawType as PropType<any>
}

export function useCollectionItemProps(descriptor: ICollectionItemDescriptor): Record<string, any> {
	const rawProps = createInspector(descriptor).getExportProps({})
	const vueProps: Record<string, any> = {}

	for (const [propName, config] of Object.entries(rawProps)) {
		vueProps[propName] = {
			...config,
			...(config.type !== undefined ? { type: resolveVueType(config.type) } : {}),
		}
	}

	return vueProps
}
