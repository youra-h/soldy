/**
 * Фабрика `createInspector` — общая для всех адаптеров.
 *
 * Адаптер связывает её со своей naming-стратегией один раз:
 *   export const createInspector = createInspectorFactory(VueNaming)
 */

import { TDescriptorInspector } from '@soldy/accessor'
import type { IAccessor, INamingStrategy } from '@soldy/accessor'
import type { IComponentDescriptor } from '../descriptors'

export type TCreateInspector = (source: IComponentDescriptor | IAccessor) => TDescriptorInspector

/**
 * Инспектор работает в двух режимах:
 * - build-time (дескриптор) — статические props/emits до появления инстанса;
 * - runtime (accessor) — фактические props/events живого компонента.
 */
export function createInspectorFactory(naming: INamingStrategy): TCreateInspector {
	return (source) => {
		if ('createAccessor' in source) {
			return new TDescriptorInspector(source.getProps(), source.getEvents(), naming)
		}

		return new TDescriptorInspector(source, naming)
	}
}
