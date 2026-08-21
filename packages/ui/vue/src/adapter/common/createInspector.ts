/**
 * createInspector — создаёт TDescriptorInspector с VueNaming.
 * Принимает IAccessor (runtime) или IComponentDescriptor (статика).
 */

import type { IComponentDescriptor } from '@soldy/setup'
import type { IAccessor } from '@soldy/accessor'
import { TDescriptorInspector } from '@soldy/accessor'
import { VueNaming } from './naming'

export function createInspector(
	source: IComponentDescriptor | IAccessor,
	naming = VueNaming,
): TDescriptorInspector {
	if ('getProps' in source && 'getEvents' in source) {
		// Runtime: IAccessor
		return new TDescriptorInspector(source as IAccessor, naming)
	}

	// Статика: IComponentDescriptor
	const descriptor = source as IComponentDescriptor
	const allProps = [...descriptor.props, ...descriptor.plugins.flatMap((p) => p.props)]
	const allEvents = [...descriptor.events, ...descriptor.plugins.flatMap((p) => p.events)]

	return new TDescriptorInspector(allProps, allEvents, naming)
}
