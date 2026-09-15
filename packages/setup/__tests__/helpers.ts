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

/**
 * Заглушка `ResizeObserver`: jsdom его не реализует.
 *
 * Помнит наблюдаемые узлы, поэтому тест видит не только то, что наблюдатель
 * заведён, но и сколько их висит за узлом: плагин, не отключивший прежний
 * наблюдатель, оставляет за узлом два.
 */
class ResizeObserverStub implements ResizeObserver {
	private readonly _elements = new Set<Element>()

	constructor() {
		resizeObservers.push(this)
	}

	observe(element: Element): void {
		this._elements.add(element)
	}

	unobserve(element: Element): void {
		this._elements.delete(element)
	}

	disconnect(): void {
		this._elements.clear()
	}

	isObserving(element: Element): boolean {
		return this._elements.has(element)
	}
}

let resizeObservers: ResizeObserverStub[] = []

/** Ставит заглушку вместо глобального `ResizeObserver` и забывает прежние наблюдатели. */
export function installResizeObserverStub(): void {
	globalThis.ResizeObserver = ResizeObserverStub
	resizeObservers = []
}

/** Сколько наблюдателей сейчас следят за узлом. */
export function observerCount(element: Element): number {
	return resizeObservers.filter((observer) => observer.isObserving(element)).length
}

/** Значение, которое тест обязан получить: без него дальше проверять нечего. */
export function required<T>(value: T | null | undefined, what: string): T {
	if (value === null || value === undefined) {
		throw new Error(`${what}: значения нет`)
	}

	return value
}
