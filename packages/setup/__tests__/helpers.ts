import { vi } from 'vitest'
import { TEvented } from '@soldy-ui/core'
import { TPluginBundle } from '@soldy-ui/plugins'
import type { IPlugin, IPluginConstructor, IPluginContext } from '@soldy-ui/plugins'
import * as exported from '../content/descriptors'
import type { IElevatorKey, TElevatorFactory } from '../protected/adapter/elevator'
import type { IComponentDescriptor } from '../protected/define'
import { callbackEventNaming, underscorePropNaming } from '../protected/naming'
import type { IAdapterProfile } from '../protected/naming'

function isComponentDescriptor(value: unknown): value is IComponentDescriptor {
	return typeof value === 'object' && value !== null && 'getProps' in value && 'plugins' in value
}

/**
 * Все дескрипторы компонентов из экспорта — не ручным списком: новый попадёт
 * под проверку сам. Определения плагинов (`AriaPluginDescriptor`) отсеиваются:
 * у них нет `getProps`.
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

/** Шпион, который помнит аргументы вызовов. */
interface ICallLog {
	readonly mock: { readonly calls: ReadonlyArray<readonly unknown[]> }
}

/** Подписки шины: что на неё повесили и что с неё сняли. */
export interface IBusSpy {
	readonly name: string
	readonly on: ICallLog
	readonly off: ICallLog
}

/** Шпионы на `on` и `off` шины у того, у кого она есть. Без шины следить не за чем. */
export function spyBus(name: string, holder: unknown): IBusSpy[] {
	const bus: unknown =
		typeof holder === 'object' && holder !== null ? Reflect.get(holder, 'events') : null

	if (!(bus instanceof TEvented)) return []

	return [{ name, on: vi.spyOn(bus, 'on'), off: vi.spyOn(bus, 'off') }]
}

/** Подписки, повешенные на шины: `<шина>: <событие>`. */
export function subscribed(spies: readonly IBusSpy[]): string[] {
	return spies.flatMap(({ name, on }) =>
		on.mock.calls.map(([event]) => `${name}: ${String(event)}`),
	)
}

/** Подписки, которые остались на шинах после уничтожения: `<шина>: <событие>`. */
export function leftovers(spies: readonly IBusSpy[]): string[] {
	return spies.flatMap(({ name, on, off }) =>
		on.mock.calls
			.filter(
				([event, handler]) =>
					!off.mock.calls.some(([e, h]) => e === event && h === handler),
			)
			.map(([event]) => `${name}: ${String(event)}`),
	)
}

/**
 * Лифт в памяти для тестов без фреймворка: одно хранилище на фабрику, дерева
 * нет. Родитель кладёт значение (`down`), ребёнок той же фабрики его берёт (`up`).
 */
export function createElevatorFactory(): {
	factory: TElevatorFactory
	store: Map<IElevatorKey<unknown>, unknown>
} {
	const store = new Map<IElevatorKey<unknown>, unknown>()

	// Как `inject<T>` во фреймворках: тип значения задаёт ключ, хранилищу он неизвестен
	const factory: TElevatorFactory = <T>(key: IElevatorKey<T>) => ({
		down: (value: T) => {
			store.set(key, value)
		},
		up: () => store.get(key) as T | undefined,
	})

	return { factory, store }
}

/** Значение, которое тест обязан получить: без него дальше проверять нечего. */
export function required<T>(value: T | null | undefined, what: string): T {
	if (value === null || value === undefined) {
		throw new Error(`${what}: значения нет`)
	}

	return value
}

/**
 * Профиль фреймворка с событиями-колбэками — как у React, Solid и Svelte:
 * `aria_label`, `onElementReady`, слот по умолчанию `children`.
 */
export const CallbackProfile: IAdapterProfile = {
	naming: { prop: underscorePropNaming, event: callbackEventNaming },
	defaultSlot: 'children',
}
