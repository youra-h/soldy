import type { IComponentDescriptor } from '@soldy/setup'
import type { IAccessor } from '@soldy/accessor'
import { TDescriptorInspector } from '@soldy/accessor'
import { AngularNaming } from './naming'

/**
 * Создаёт TDescriptorInspector с Angular-стратегией именования.
 *
 * - Static (build-time): `createInspector(descriptor)` — useInputs / useOutputs
 * - Runtime: `createInspector(adapter.accessor)` — useAdapter
 */
export function createInspector(
	source: IComponentDescriptor | IAccessor,
	naming = AngularNaming,
): TDescriptorInspector {
	if ('createAccessor' in source) {
		return new TDescriptorInspector(source.getProps(), source.getEvents(), naming)
	}

	return new TDescriptorInspector(source as IAccessor, naming)
}
