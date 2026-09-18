/**
 * createAdapterContext — контекст адаптера: собранный компонент и его расширения.
 *
 * Инстанс, состав, набор и аксессор собирает `assemble/`; контекст держит
 * собранное и расширения адаптера (`TAdapterContext`).
 */

import { assembleComponent } from '../../assemble'
import type { IComponentDescriptor, IPluginDefinition, TPluginOutputsFrom } from '../../define'
import { TAdapterContext } from './adapter-context.class'
import type { IAdapterContext, IAdapterContextConfig, IAdapterContextOptions } from './types'

/**
 * Тип контекста выводится из дескриптора: инстанс — из `ctor`, выходы — из
 * состава плагинов. Адаптер, который не передаёт дженерики явно, получает оба
 * без единой строки в компоненте.
 */
export function createAdapterContext<
	TInstance extends object,
	TPlugins extends readonly IPluginDefinition[] = readonly [],
>(
	descriptor: IComponentDescriptor<any, any, TPlugins, any, TInstance>,
	options: IAdapterContextOptions<TInstance>,
	config: IAdapterContextConfig = {},
): IAdapterContext<TInstance, TPluginOutputsFrom<TPlugins>> {
	const component = assembleComponent(descriptor, { ...options, bundle: config.bundle })

	return new TAdapterContext(descriptor, component, options.props ?? {})
}
