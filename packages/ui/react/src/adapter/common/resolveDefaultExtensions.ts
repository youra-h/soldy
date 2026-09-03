/**
 * resolveDefaultExtensions — определяет стартовый набор расширений adapter-context'а.
 *
 * TPluginsBindingExtension требует TElementPlugin в бандле и выбрасывает
 * исключение, если плагина нет. Поэтому он подключается только для
 * компонентов с DOM-слоем (ComponentView и ниже); для headless-слоёв
 * (Component) — пустой набор.
 */

import type { IComponentDescriptor } from '@soldy/setup'
import { TPluginsBindingExtension } from '@soldy/setup'
import { TElementPlugin } from '@soldy/plugins'

export function resolveDefaultExtensions(descriptor: IComponentDescriptor): any[] {
	const hasElementPlugin = (descriptor.plugins ?? []).some((p) => p.ctor === TElementPlugin)

	return hasElementPlugin ? [TPluginsBindingExtension] : []
}
