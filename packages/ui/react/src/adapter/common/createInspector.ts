/**
 * createInspector — создаёт TDescriptorInspector с ReactNaming.
 * Принимает IAccessor (runtime) или IComponentDescriptor (статика).
 */

import type { IComponentDescriptor } from '@soldy/setup'
import type { IAccessor } from '@soldy/accessor'
import { TDescriptorInspector } from '@soldy/accessor'
import { ReactNaming } from './naming'

export function createInspector(
	source: IComponentDescriptor | IAccessor,
	naming = ReactNaming,
): TDescriptorInspector {
	if ('getProps' in source && 'getEvents' in source) {
		// Runtime: IAccessor
		return new TDescriptorInspector(source as IAccessor, naming)
	}

	// Статика: IComponentDescriptor
	const descriptor = source as IComponentDescriptor

	const pluginProps = descriptor.plugins?.flatMap((p) => p.props ?? []) ?? []
	const pluginEvents = descriptor.plugins?.flatMap((p) => p.events ?? []) ?? []

	const allProps = [...descriptor.props, ...pluginProps]
	const allEvents = [...descriptor.events, ...pluginEvents]

	return new TDescriptorInspector(allProps, allEvents, naming)
}
