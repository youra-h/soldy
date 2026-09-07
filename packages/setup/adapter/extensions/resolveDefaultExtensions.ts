/**
 * resolveDefaultExtensions — стартовый набор расширений adapter-context'а.
 *
 * TPluginsBindingExtension бросает исключение, если в бандле нет TElementPlugin,
 * поэтому он подключается только для компонентов с DOM-слоем (ComponentView
 * и ниже). Для headless-слоёв набор пустой.
 *
 * TPluginPropsExtension нужен только там, где у плагина есть пропсы, которые
 * пишутся снаружи. У большинства плагинов все пропсы `protected` — они
 * вычисляют их сами, и подключать расширение незачем.
 *
 * Используется как значение по умолчанию в createAdapterContext, так что
 * адаптеру достаточно не передавать defaultExtensions вовсе.
 */

import { TElementPlugin } from '@soldy/plugins'
import type { IComponentDescriptor } from '../../descriptors'
import type { TAnyExtensionCtor } from '../context/types'
import { TPluginsBindingExtension } from './plugins-binding.extension.class'
import { TPluginPropsExtension } from './plugin-props.extension.class'

export function resolveDefaultExtensions(
	descriptor: IComponentDescriptor,
): Array<TAnyExtensionCtor> {
	const extensions: Array<TAnyExtensionCtor> = []

	if (descriptor.plugins.some((plugin) => plugin.ctor === TElementPlugin)) {
		extensions.push(TPluginsBindingExtension)
	}

	const hasWritablePluginProps = descriptor.plugins.some((plugin) =>
		(plugin.props ?? []).some((prop) => !prop.protected),
	)

	if (hasWritablePluginProps) {
		extensions.push(TPluginPropsExtension)
	}

	return extensions
}
