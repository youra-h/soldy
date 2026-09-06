/**
 * IAdapterContext — единый headless-контекст жизненного цикла компонента.
 *
 * Registry-паттерн: расширения регистрируются через .use(Ctor, opts?) и извлекаются через .get(Ctor).
 * Жизненный цикл управляется через TEvented — destroy() эмитит событие 'destroy'.
 *
 * Идентичен архитектуре плагинов: .use() / .get() по классу.
 */

import { TEvented } from '@soldy/core'
import type {
	IAdapterContext,
	TAdapterEvents,
	TAnyExtensionCtor,
	IAdapterContextConfig,
	IAdapterContextOptions,
} from './types'
import { resolveDefaultExtensions } from '../extensions'
import type { IComponentDescriptor } from '@soldy/setup'

export function createAdapterContext(
	descriptor: IComponentDescriptor,
	options: IAdapterContextOptions,
	config: IAdapterContextConfig = {},
): IAdapterContext {
	const instance =
		options.ctrl ?? new (descriptor.ctor as any)(options.props ?? {}, options.options ?? {})
	const bundle = config.bundle ?? descriptor.createBundle(instance)
	const accessor = descriptor.createAccessor(instance, bundle)

	const events = new TEvented<TAdapterEvents>()
	const extensionsMap = new Map<TAnyExtensionCtor, any>()

	const context: IAdapterContext = {
		instance,
		bundle,
		accessor,
		descriptor,
		props: options.props ?? {},
		events,

		use(ExtensionCtor: any, opts?: any) {
			const ext = new ExtensionCtor(this, opts)

			extensionsMap.set(ExtensionCtor, ext)

			return this
		},

		get(ExtensionCtor: any) {
			return extensionsMap.get(ExtensionCtor)
		},

		destroy() {
			events.emit('destroy')
			extensionsMap.clear()
		},
	}

	// Применяем стартовый набор расширений. По умолчанию — только те, что
	// применимы к дескриптору: TPluginsBindingExtension требует TElementPlugin
	// и бросает исключение, если его нет (headless-слои).
	const defaultExtensions = config.defaultExtensions ?? resolveDefaultExtensions(descriptor)

	for (const Ext of defaultExtensions) {
		;(context as any).use(Ext)
	}

	return context
}
