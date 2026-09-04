import type { IComponentDescriptor } from '@soldy/setup'
import type { IAccessor } from '@soldy/accessor'
import { TDescriptorInspector } from '@soldy/accessor'
import { VueNaming } from './naming'

/**
 * - Static (build-time): `createInspector(descriptor)` — useProps.ts, useEmits.ts
 * - Runtime: `createInspector(adapter.accessor)` — useAdapter.ts
 */
export function createInspector(source: IComponentDescriptor | IAccessor): TDescriptorInspector {
	if ('createAccessor' in source) {
		return new TDescriptorInspector(source.getProps(), source.getEvents(), VueNaming)
	}

	return new TDescriptorInspector(source as IAccessor, VueNaming)
}
