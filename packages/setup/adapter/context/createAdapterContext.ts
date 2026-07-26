/**
 * IAdapterContext — единый headless-контекст жизненного цикла компонента.
 *
 * Registry-паттерн: расширения регистрируются через .use(Ctor, opts?) и извлекаются через .get(Ctor).
 * Жизненный цикл управляется через TEvented — destroy() эмитит событие 'destroy'.
 *
 * Идентичен архитектуре плагинов: .use() / .get() / статический key.
 */

import { TEvented } from '@soldy/core'
import type { IAdapterContext, TAdapterEvents, IAdapterExtensionCtor } from './types'
import { TPluginsBindingExtension } from '../extensions'
import type { IComponentDescriptor } from '@soldy/setup'

export function createAdapterContext(
	descriptor: IComponentDescriptor,
	options: { ctrl?: any; plugins?: any; props?: any },
	defaultExtensions: Array<IAdapterExtensionCtor<any, any>> = [TPluginsBindingExtension],
): IAdapterContext {
	const instance = options.ctrl ?? new (descriptor.ctor as any)({ props: options.props })
	const bundle = options.plugins ?? descriptor.createBundle()
	const accessor = descriptor.createAccessor(instance, bundle)

	const events = new TEvented<TAdapterEvents>()
	const extensionsMap = new Map<symbol, any>()

	const context: IAdapterContext = {
		instance,
		bundle,
		accessor,
		events,

		use(ExtensionCtor: any, opts?: any) {
			const ext = new ExtensionCtor(this, opts)
			extensionsMap.set(ExtensionCtor.key, ext)
			return this
		},

		get(ctorOrKey: any) {
			const key = typeof ctorOrKey === 'symbol' ? ctorOrKey : ctorOrKey.key
			return extensionsMap.get(key)
		},

		destroy() {
			events.emit('destroy')
			extensionsMap.clear()
		},
	}

	// Применяем стартовый набор расширений
	for (const Ext of defaultExtensions) {
		context.use(Ext)
	}

	return context
}
