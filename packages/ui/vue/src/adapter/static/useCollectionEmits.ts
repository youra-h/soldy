/**
 * Статический хелпер для сборки emits коллекции во Vue Options API.
 *
 * Аналог useEmits, но для ICollectionDescriptor.
 */

import type { ICollectionDescriptor } from '@soldy/setup'
import { createInspector } from '../common'

export function useCollectionEmits(descriptor: ICollectionDescriptor): string[] {
	const inspector = createInspector(descriptor)
	const emits = inspector.getExportEvents()

	for (const prop of descriptor.props) {
		if (!prop.protected && prop.triggers.length > 0) {
			emits.push(`update:${inspector.getExportPropName(prop)}`)
		}
	}

	return Array.from(new Set(emits))
}
