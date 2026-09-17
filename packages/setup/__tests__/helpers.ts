import { TPluginBundle } from '@soldy/plugins'
import type { IPlugin, IPluginConstructor, IPluginContext } from '@soldy/plugins'
import * as exported from '../descriptors'
import type { IComponentDescriptor } from '../descriptors'

function isComponentDescriptor(value: unknown): value is IComponentDescriptor {
	return (
		typeof value === 'object' && value !== null && 'createBundle' in value && 'plugins' in value
	)
}

/**
 * Все дескрипторы компонентов из экспорта — не ручным списком: новый попадёт
 * под проверку сам. Определения плагинов (`AriaPluginDescriptor`) отсеиваются:
 * у них нет `createBundle`.
 */
export function exportedDescriptors(): Array<[string, IComponentDescriptor]> {
	const entries: Record<string, unknown> = exported
	const result: Array<[string, IComponentDescriptor]> = []

	for (const [name, factory] of Object.entries(entries)) {
		if (!name.endsWith('Descriptor') || typeof factory !== 'function') continue

		const value: unknown = factory()

		if (isComponentDescriptor(value)) result.push([name, value])
	}

	return result
}

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
 * Помнит колбэк и наблюдаемые узлы. Поэтому тест может сам вызвать
 * срабатывание (`triggerResize`) и проверить пересчёт без scroll/resize, а
 * ещё видит, сколько наблюдателей висит за узлом: плагин, не отключивший
 * прежний наблюдатель, оставляет за узлом два.
 */
class ResizeObserverStub implements ResizeObserver {
	private readonly _callback: ResizeObserverCallback
	private readonly _elements = new Set<Element>()

	constructor(callback: ResizeObserverCallback) {
		this._callback = callback
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

	trigger(element: Element): void {
		if (!this._elements.has(element)) return

		const entry: ResizeObserverEntry = {
			target: element,
			contentRect: element.getBoundingClientRect(),
			borderBoxSize: [],
			contentBoxSize: [],
			devicePixelContentBoxSize: [],
		}

		this._callback([entry], this)
	}
}

let resizeObservers: ResizeObserverStub[] = []

/** Ставит заглушку вместо глобального `ResizeObserver` и забывает прежние наблюдатели. */
export function installResizeObserverStub(): void {
	globalThis.ResizeObserver = ResizeObserverStub
	resizeObservers = []
}

/** Срабатывание наблюдателей узла без реального изменения раскладки. */
export function triggerResize(element: Element): void {
	for (const observer of resizeObservers) observer.trigger(element)
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
