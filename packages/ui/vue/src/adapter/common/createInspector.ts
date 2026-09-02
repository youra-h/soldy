/**
 * Единый хелпер для работы с TDescriptorInspector.
 *
 * createInspector — единый генератор инспектора для пропсов, эмитов и runtime.
 * Принимает как Descriptor, так и Accessor.
 *
 * useProps / useEmits вынесены в static/ — см. static/useProps.ts и static/useEmits.ts.
 */

import type { IComponentDescriptor } from '@soldy/setup'
import type { TComponentAccessor, INamingStrategy, IComponentSchema } from '@soldy/accessor'
import { TDescriptorInspector } from '@soldy/accessor'
import { VueNaming } from './naming'

/**
 * Единый генератор инспектора.
 * Принимает как Descriptor, так и Accessor — унифицирует создание TDescriptorInspector
 * для useVue, useSyncProps, useSyncEvents, useProps и useEmits.
 */
export function createInspector(
	target: IComponentDescriptor | TComponentAccessor,
	naming: INamingStrategy = VueNaming,
): TDescriptorInspector {
	const schema: IComponentSchema = (target as any).getSchema
		? (target as any).getSchema()
		: target

	return new TDescriptorInspector(schema, naming || VueNaming)
}
