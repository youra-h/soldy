/**
 * Статический хелпер для сборки props коллекции во Vue Options API.
 *
 * Аналог useProps, но для ICollectionDescriptor.
 */

import type { PropType } from 'vue'
import type { ICollectionDescriptor } from '@soldy/setup'
import { createInspector } from '../common'

function resolveVueType(rawType: any): PropType<any> | undefined {
	if (!rawType) return undefined
	if (typeof rawType === 'object' && rawType.ctor) return rawType.ctor as PropType<any>
	return rawType as PropType<any>
}

export function useCollectionProps(descriptor: ICollectionDescriptor): Record<string, any> {
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
