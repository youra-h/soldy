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

/**
 * Имя места вложенного компонента: из опций, а без них — из пропсов фреймворка.
 * Проп `embedded` объявлен у всех компонентов (`EntityContribution`), и читает
 * его setup, а не каждый адаптер: шаг, который шесть адаптеров обязаны помнить,
 * седьмой забудет.
 */
function embeddedOf(options: IAdapterContextOptions<object>): string | undefined {
	if (options.embedded !== undefined) return options.embedded

	const value: unknown = options.props ? Reflect.get(options.props, 'embedded') : undefined

	return typeof value === 'string' ? value : undefined
}

export function createAdapterContext<TInstance extends object>(
	descriptor: IComponentDescriptor<any, any, any, any, TInstance>,
	options: IAdapterContextOptions<TInstance>,
	config: IAdapterContextConfig = {},
): IAdapterContext<TInstance> {
	const instance = options.ctrl ?? new descriptor.ctor(options.props ?? {}, options.options ?? {})
	// Набор, пришедший в конфиге, принадлежит тому, кто его передал (адаптер
	// коллекции делит bundle компонента) — уничтожает его он же.
	const ownsBundle = config.bundle === undefined
	const embedded = embeddedOf(options)
	const bundle = config.bundle ?? descriptor.createBundle(instance, { embedded })
	const accessor = descriptor.createAccessor(instance, bundle)

	const events = new TEvented<TAdapterEvents>()
	const extensions = new Map<TAnyExtensionCtor, unknown>()

	const context: IAdapterContext<TInstance> = {
		instance,
		bundle,
		accessor,
		descriptor,
		props: options.props ?? {},
		embedded,
		events,

		use(ExtensionCtor: TAnyExtensionCtor, extensionOptions?: unknown) {
			extensions.set(ExtensionCtor, new ExtensionCtor(this, extensionOptions))

			return this
		},

		get<T>(ExtensionCtor: new (...args: any[]) => T): T | undefined {
			const extension = extensions.get(ExtensionCtor)

			return extension instanceof ExtensionCtor ? extension : undefined
		},

		destroy() {
			events.emit('destroy')
			extensions.clear()

			// После расширений: `destroy` у них отвязывает узел от плагинов,
			// и плагины успевают получить `removed`
			if (ownsBundle) bundle?.destroy()
		},
	}

	// Применяем стартовый набор расширений. По умолчанию — только те, что
	// применимы к дескриптору: TPluginsBindingExtension требует TElementPlugin
	// и бросает исключение, если его нет (headless-слои).
	const defaultExtensions = config.defaultExtensions ?? resolveDefaultExtensions(descriptor)

	for (const Ext of defaultExtensions) {
		context.use(Ext)
	}

	return context
}
