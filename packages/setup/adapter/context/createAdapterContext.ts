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
	IAdapterExtensionCtor,
	IAdapterExtensionCtorNoOpts,
} from './types'
import { TPluginsBindingExtension } from '../extensions'
import type { IComponentDescriptor } from '@soldy/setup'

type TAnyExtensionCtor = IAdapterExtensionCtorNoOpts<any> | IAdapterExtensionCtor<any, any>

export function createAdapterContext(
	descriptor: IComponentDescriptor,
	options: { ctrl?: any; props?: Readonly<Record<string, any>> },
	defaultExtensions: Array<TAnyExtensionCtor> = [TPluginsBindingExtension],
): IAdapterContext {
	const instance = options.ctrl ?? new (descriptor.ctor as any)(options.props ?? {})
	const bundle = descriptor.createBundle(instance)
	const accessor = descriptor.createAccessor(instance, bundle)

	const events = new TEvented<TAdapterEvents>()
	const extensionsMap = new Map<TAnyExtensionCtor, any>()

	const context: IAdapterContext = {
		instance,
		bundle,
		accessor,
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

	// Применяем стартовый набор расширений
	for (const Ext of defaultExtensions) {
		;(context as any).use(Ext)
	}

	return context
}
