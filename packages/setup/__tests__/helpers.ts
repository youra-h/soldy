import { TPluginBundle } from '@soldy/plugins'
import type { IPlugin, IPluginConstructor, IPluginContext } from '@soldy/plugins'

/**
 * Контекст установки плагина для тестов без адаптера фреймворка.
 *
 * Плагины тест создаёт сам — чтобы держать на них ссылки, — поэтому контекст
 * ищет среди них по классу. Инстанс владельца отдаёт настоящий `TPluginBundle`:
 * у `getInstance<T>()` тот же контракт, что в рантайме.
 */
export function createPluginContext(
	instance: object,
	plugins: readonly IPlugin<any, any>[] = [],
): IPluginContext {
	const bundle = new TPluginBundle(instance)

	return {
		get<P extends IPlugin<any, any>>(ctor: IPluginConstructor<any, any, P>): P | undefined {
			return plugins.find((plugin): plugin is P => plugin instanceof ctor)
		},
		getInstance: bundle.getInstance.bind(bundle),
	}
}

/** Значение, которое тест обязан получить: без него дальше проверять нечего. */
export function required<T>(value: T | null | undefined, what: string): T {
	if (value === null || value === undefined) {
		throw new Error(`${what}: значения нет`)
	}

	return value
}
