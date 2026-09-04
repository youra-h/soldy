import type { IComponentDescriptor } from '@soldy/setup'
import type { IAccessor } from '@soldy/accessor'
import { TDescriptorInspector } from '@soldy/accessor'
import { ReactNaming } from './naming'

/**
 * - Static (build-time): `createInspector(descriptor)` — not used directly (see useAdapter)
 * - Runtime: `createInspector(adapter.accessor)` — useAdapter.ts
 */
export function createInspector(
	source: IComponentDescriptor | IAccessor,
	naming = ReactNaming,
): TDescriptorInspector {
	if ('createAccessor' in source) {
		return new TDescriptorInspector(source.getProps(), source.getEvents(), naming)
	}

	return new TDescriptorInspector(source as IAccessor, naming)
}
