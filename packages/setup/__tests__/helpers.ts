import { vi } from 'vitest'
import { TCollectionComponent, TCollectionItemComponent, TEvented } from '@soldy-ui/core'
import { TIdPlugin, TPluginBundle } from '@soldy-ui/plugins'
import type { IPlugin, IPluginBundle, IPluginConstructor, IPluginContext } from '@soldy-ui/plugins'
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
 * Фасад коллекции или её элемента — класс дескриптора наследует
 * `TCollectionComponent` или `TCollectionItemComponent`. Своего инстанса без
 * владельца у них нет. Дескриптор без своего класса (`CollectionDescriptor`)
 * фасадом не считается: его класс — `Object`.
 */
export const isFacade = (descriptor: IComponentDescriptor): boolean =>
	descriptor.ctor.prototype instanceof TCollectionComponent ||
	descriptor.ctor.prototype instanceof TCollectionItemComponent

/**
 * Контекст установки плагина для тестов без адаптера фреймворка.
 *
 * Плагины тест создаёт сам — чтобы держать на них ссылки, — поэтому контекст
 * ищет среди них по классу. Инстанс владельца и `id` частей отдаёт настоящий
 * `TPluginBundle`: у `getInstance<T>()` и `createId` тот же контракт, что в
 * рантайме.
 */
export function createPluginContext(
	instance: object,
	plugins: readonly IPlugin<any, any>[] = [],
	mountId?: string,
): IPluginContext {
	const bundle = new TPluginBundle(instance, mountId)

	return {
		get<P extends IPlugin<any, any>>(ctor: IPluginConstructor<any, any, P>): P | undefined {
			return plugins.find((plugin): plugin is P => plugin instanceof ctor)
		},
		getInstance: bundle.getInstance.bind(bundle),
		createId: bundle.createId.bind(bundle),
		locale: bundle.locale,
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

/**
 * Шина под наблюдением: что на неё вешали и что на ней висит сейчас.
 *
 * Живое считается так же, как его держит сама шина: пара «событие,
 * обработчик» — одна подписка, `off` её снимает, перехватчик `use` и
 * слушатель всех событий `listen` живут до своей отписки, `destroy()` шины
 * снимает всё. Перехватчики и слушатели считаются наравне с подписками: на
 * перехватчиках висит проброс `relayAll`, а слушателем шину участника держит
 * обмен адаптера.
 */
export interface IBusSpy {
	readonly name: string
	/** Подписки `on` по порядку — имена событий. */
	readonly subscribed: readonly string[]
	/**
	 * Что висит на шине сейчас: события живых подписок, `use` на каждый
	 * перехватчик и `listen` на каждого слушателя.
	 */
	live(): string[]
}

/** Шпион на шину того, у кого она есть. Без шины следить не за чем. */
export function spyBus(name: string, holder: unknown): IBusSpy[] {
	const bus: unknown =
		typeof holder === 'object' && holder !== null ? Reflect.get(holder, 'events') : null

	if (!(bus instanceof TEvented)) return []

	const on = bus.on.bind(bus)
	const off = bus.off.bind(bus)
	const use = bus.use.bind(bus)
	const listen = bus.listen.bind(bus)
	const unlisten = bus.unlisten.bind(bus)
	const destroy = bus.destroy.bind(bus)
	const subscribed: string[] = []
	const handlers = new Map<unknown, Set<string>>()
	const middlewares = new Set<object>()
	// Слушатель, поставленный дважды, снимается по одному разу — список, а не набор
	const listeners: unknown[] = []

	vi.spyOn(bus, 'on').mockImplementation((event, handler) => {
		const events = handlers.get(handler) ?? new Set<string>()

		subscribed.push(String(event))
		events.add(String(event))
		handlers.set(handler, events)
		on(event, handler)
	})
	vi.spyOn(bus, 'off').mockImplementation((event, handler) => {
		handlers.get(handler)?.delete(String(event))
		off(event, handler)
	})
	vi.spyOn(bus, 'use').mockImplementation((middleware) => {
		const token = {}
		const release = use(middleware)

		middlewares.add(token)

		return () => {
			middlewares.delete(token)
			release()
		}
	})
	vi.spyOn(bus, 'listen').mockImplementation((listener) => {
		listeners.push(listener)
		listen(listener)
	})
	vi.spyOn(bus, 'unlisten').mockImplementation((listener) => {
		const index = listeners.indexOf(listener)

		if (index !== -1) listeners.splice(index, 1)
		unlisten(listener)
	})
	vi.spyOn(bus, 'destroy').mockImplementation(() => {
		handlers.clear()
		middlewares.clear()
		listeners.length = 0
		destroy()
	})

	return [
		{
			name,
			subscribed,
			live: () => [
				...[...handlers.values()].flatMap((events) => [...events]),
				...[...middlewares].map(() => 'use'),
				...listeners.map(() => 'listen'),
			],
		},
	]
}

/** Подписки, повешенные на шины: `<шина>: <событие>`. */
export function subscribed(spies: readonly IBusSpy[]): string[] {
	return spies.flatMap(({ name, subscribed }) => subscribed.map((event) => `${name}: ${event}`))
}

/** Что осталось на шинах после уничтожения: `<шина>: <событие>` и `<шина>: use`. */
export function leftovers(spies: readonly IBusSpy[]): string[] {
	return spies.flatMap(({ name, live }) => live().map((event) => `${name}: ${event}`))
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

/** Слой лифта-дерева: значения своего узла и родитель — как у `provide`/`inject`. */
export type TElevatorLayer = {
	readonly values: Map<IElevatorKey<unknown>, unknown>
	readonly parent?: TElevatorLayer
}

/** Слой узла под родителем; без родителя — корень дерева. */
export const childOf = (parent?: TElevatorLayer): TElevatorLayer => ({
	values: new Map(),
	parent,
})

/** Найти значение ключа у слоя и его предков — ближайшее. */
function lookup(layer: TElevatorLayer | undefined, key: IElevatorKey<unknown>): unknown {
	for (let current = layer; current; current = current.parent) {
		if (current.values.has(key)) return current.values.get(key)
	}

	return undefined
}

/**
 * Лифт узла дерева для тестов без фреймворка: `down()` пишет в свой слой,
 * `up()` читает у предков, а не у себя, — как `inject` во Vue читает
 * `provide` родителя. Поэтому порядок, в котором узел берёт и отдаёт значение
 * одного ключа, не важен.
 */
export function elevatorOf(layer: TElevatorLayer): TElevatorFactory {
	// Как `inject<T>` во фреймворках: тип значения задаёт ключ, хранилищу он неизвестен
	return <T>(key: IElevatorKey<T>) => ({
		down: (value: T) => {
			layer.values.set(key, value)
		},
		up: () => lookup(layer.parent, key) as T | undefined,
	})
}

/** Значение, которое тест обязан получить: без него дальше проверять нечего. */
export function required<T>(value: T | null | undefined, what: string): T {
	if (value === null || value === undefined) {
		throw new Error(`${what}: значения нет`)
	}

	return value
}

/** `id`, который задаёт приложение, — `TIdPlugin` набора контекста. */
export function idPluginOf(context: { readonly bundle: IPluginBundle | null }): TIdPlugin {
	return required(context.bundle?.get(TIdPlugin), 'TIdPlugin')
}

/**
 * Профиль фреймворка с событиями-колбэками — как у React, Solid и Svelte:
 * `aria_label`, `onElementReady`, слот по умолчанию `children`.
 */
export const CallbackProfile: IAdapterProfile = {
	naming: { prop: underscorePropNaming, event: callbackEventNaming },
	defaultSlot: 'children',
}

/**
 * A framework that applies a group of writes (`batch` of its profile) only
 * at the group's end and drops the group's writes when it throws. `trace` is
 * what the exchange did: `state:<name>` — a write to the framework's state,
 * `event:<name>` — the sink, `batch:start`, `batch:end` and `batch:nested` —
 * the groups. `applied` is what the framework shows: the values applied so
 * far. A nested group is a part of the outer one, and its writes wait for
 * the outer group's end.
 */
export function groupingFramework(base: IAdapterProfile = CallbackProfile) {
	const trace: string[] = []
	const applied = new Map<string, unknown>()
	let pending: Array<readonly [string, unknown]> | undefined

	const profile: IAdapterProfile = {
		...base,
		batch: (update) => {
			if (pending) {
				trace.push('batch:nested')
				update()

				return
			}

			const writes: Array<readonly [string, unknown]> = []

			pending = writes
			trace.push('batch:start')

			try {
				update()
			} finally {
				pending = undefined
			}

			for (const [name, value] of writes) applied.set(name, value)

			trace.push('batch:end')
		},
	}

	return {
		profile,
		trace,
		applied,
		/** The framework's state listener: inside a group the write waits for the group's end. */
		write: (name: string, value: unknown): void => {
			trace.push(`state:${name}`)

			if (pending) pending.push([name, value])
			else applied.set(name, value)
		},
		/** The framework's sink of events. */
		sink: (name: string): void => {
			trace.push(`event:${name}`)
		},
	}
}
