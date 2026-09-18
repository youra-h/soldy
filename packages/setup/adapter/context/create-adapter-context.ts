/**
 * createAdapterContext — контекст адаптера: сборка компонента, контекст, стартовые расширения.
 *
 * Инстанс, набор и аксессор собирает `assemble/`; контекст держит собранное и
 * расширения адаптера (`TAdapterContext`).
 */

import { assembleComponent } from '../../assemble'
import type { IComponentDescriptor } from '../../define'
import { resolveDefaultExtensions } from '../extensions/plugins'
import { TAdapterContext } from './adapter-context.class'
import type { IAdapterContext, IAdapterContextConfig, IAdapterContextOptions } from './types'

export function createAdapterContext<TInstance extends object>(
	descriptor: IComponentDescriptor<any, any, any, any, TInstance>,
	options: IAdapterContextOptions<TInstance>,
	config: IAdapterContextConfig = {},
): IAdapterContext<TInstance> {
	const component = assembleComponent(descriptor, { ...options, bundle: config.bundle })
	const context = new TAdapterContext(descriptor, component, options.props ?? {})

	// Применяем стартовый набор расширений. По умолчанию — только те, что
	// применимы к дескриптору: TPluginsBindingExtension требует TElementPlugin
	// и бросает исключение, если его нет (headless-слои).
	const defaultExtensions = config.defaultExtensions ?? resolveDefaultExtensions(descriptor)

	for (const Ext of defaultExtensions) {
		context.use(Ext)
	}

	return context
}
