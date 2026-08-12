/**
 * Единый хелпер для работы с TDescriptorInspector.
 *
 * createInspector — единый генератор инспектора для пропсов, эмитов и runtime.
 * Принимает как Descriptor, так и Accessor.
 *
 * useProps / useEmits вынесены в static/ — см. static/useProps.ts и static/useEmits.ts.
 */

import type { IComponentDescriptor } from '@soldy/setup'
import type { TComponentAccessor, TCollectionAccessor, INamingStrategy, IComponentSchema, ICollectionSchema } from '@soldy/accessor'
import { TDescriptorInspector } from '@soldy/accessor'
import { VueNaming } from './naming'

/**
 * Единый генератор инспектора.
 * Принимает Descriptor (любого типа), Accessor или Schema — унифицирует создание TDescriptorInspector.
 */
export function createInspector(
	target: IComponentDescriptor | TComponentAccessor | TCollectionAccessor | IComponentSchema | ICollectionSchema,
	naming: INamingStrategy = VueNaming,
): TDescriptorInspector {
	const schema: IComponentSchema = ((target as any).getSchema
		? (target as any).getSchema()
		: target) as IComponentSchema

	return new TDescriptorInspector(schema, naming || VueNaming)
}
