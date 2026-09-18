/**
 * createAdapterContext — контекст адаптера: собранный компонент и его расширения.
 *
 * Инстанс, состав, набор и аксессор собирает `assemble/`; контекст держит
 * собранное и расширения адаптера (`TAdapterContext`).
 */

import { assembleComponent } from '../../assemble'
import type { IComponentDescriptor } from '../../define'
import { TAdapterContext } from './adapter-context.class'
import type { IAdapterContext, IAdapterContextConfig, IAdapterContextOptions } from './types'

export function createAdapterContext<TInstance extends object>(
	descriptor: IComponentDescriptor<any, any, any, any, TInstance>,
	options: IAdapterContextOptions<TInstance>,
	config: IAdapterContextConfig = {},
): IAdapterContext<TInstance> {
	const component = assembleComponent(descriptor, { ...options, bundle: config.bundle })

	return new TAdapterContext(descriptor, component, options.props ?? {})
}
