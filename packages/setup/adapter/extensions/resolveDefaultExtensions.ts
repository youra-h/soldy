/**
 * resolveDefaultExtensions — стартовый набор расширений adapter-context'а.
 *
 * TPluginsBindingExtension бросает исключение, если в бандле нет TElementPlugin,
 * поэтому он подключается только для компонентов с DOM-слоем (ComponentView
 * и ниже). Для headless-слоёв набор пустой.
 *
 * Используется как значение по умолчанию в createAdapterContext, так что
 * адаптеру достаточно не передавать defaultExtensions вовсе.
 */

import { TElementPlugin } from '@soldy/plugins'
import type { IComponentDescriptor } from '../../descriptors'
import type { TAnyExtensionCtor } from '../context/types'
import { TPluginsBindingExtension } from './plugins-binding.extension.class'

export function resolveDefaultExtensions(
	descriptor: IComponentDescriptor,
): Array<TAnyExtensionCtor> {
	const hasElementPlugin = descriptor.plugins.some((plugin) => plugin.ctor === TElementPlugin)

	return hasElementPlugin ? [TPluginsBindingExtension] : []
}
