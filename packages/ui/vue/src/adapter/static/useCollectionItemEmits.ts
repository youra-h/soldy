import type { ICollectionItemDescriptor } from '@soldy/setup'
import { createInspector } from '../common'

export function useCollectionItemEmits(descriptor: ICollectionItemDescriptor): string[] {
	const inspector = createInspector(descriptor)
	const emits = inspector.getExportEvents()

	for (const prop of descriptor.props) {
		if (!prop.protected && prop.triggers.length > 0) {
			emits.push(`update:${inspector.getExportPropName(prop)}`)
		}
	}

	return Array.from(new Set(emits))
}
