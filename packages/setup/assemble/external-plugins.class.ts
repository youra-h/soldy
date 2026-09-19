/**
 * TExternalPlugins — плагины, поставленные снаружи: их пропсы из `pluginProps` и события конвертом `plugin:event`.
 *
 * Плагин дескриптора объявляет пропсы и события через поверхность компонента.
 * Плагин снаружи — нет: статический слой Vue, Angular и Web Components
 * объявляет поверхность раньше, чем приложение его регистрирует, а поставить
 * его можно и позже, в `bundle:create`. Поэтому у каждого компонента один
 * проп на все такие плагины — `pluginProps` (`{ timer_ms: 500 }`) — и одно
 * событие — `plugin:event` (`{ name: 'timer:tick', args }`). Какие пропсы и
 * события у плагина, говорит его контракт (`pluginContractOf`), записанный
 * `definePlugin` за классом.
 *
 * Путь один, когда бы плагин ни встал: при сборке (`usePlugins`) или позже
 * (`bundle.use`) — набор сообщает `use`, и плагин подключается одинаково.
 * Значения, пришедшие раньше плагина, ждут его. Пишет значение само свойство
 * (`TProperty`), по тому же правилу, что и проп компонента: начальное, равное
 * умолчанию декларации, ничего не задаёт, а ключ, пропавший из `pluginProps`,
 * возвращает проп к умолчанию.
 *
 * Конверт уходит на шину инстанса, как и `bundle:create`: это канал, видимый
 * и адаптеру (`@plugin:event`, `onPluginEvent`), и тому, у кого на руках
 * только `ctrl`.
 */

import { TProperty } from '@soldy/accessor'
import type { TName } from '@soldy/accessor'
import { isEventSource } from '@soldy/core'
import type { IEventEmitter, TPluginEvent } from '@soldy/core'
import type { IPlugin, IPluginBundle } from '@soldy/plugins'
import { pluginContractOf } from '../define'
import type { IPluginDefinition, TPluginCtor } from '../define'
import { underscorePropNaming } from '../naming'

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === 'object' && value !== null
}

/** Значения `pluginProps`: не объект — значит, ничего не задано. */
function valuesOf(values: unknown): Readonly<Record<string, unknown>> {
	return isRecord(values) ? values : {}
}

/** Шина событий инстанса — если она у него есть. */
function hasEmit(value: unknown): value is Pick<IEventEmitter, 'emit'> {
	return isRecord(value) && 'emit' in value && typeof value.emit === 'function'
}

export class TExternalPlugins {
	/** Текущие значения `pluginProps`. */
	private _values: Readonly<Record<string, unknown>>
	/** Ключ `pluginProps` (`timer_ms`) → проп подключённого плагина. */
	private readonly _props = new Map<string, TProperty>()
	/** Подключённый плагин → его ключи и отписка от его событий. */
	private readonly _attached = new Map<TPluginCtor, { keys: string[]; off: () => void }>()
	private readonly _off: () => void

	/**
	 * @param own плагины дескриптора: их контракт уже в поверхности компонента
	 * @param installed плагины, поставленные при сборке, в порядке установки
	 */
	constructor(
		bundle: IPluginBundle,
		private readonly _instance: object,
		private readonly _own: ReadonlySet<TPluginCtor>,
		installed: readonly TPluginCtor[],
		values: unknown,
	) {
		this._values = valuesOf(values)

		for (const ctor of installed) {
			const plugin = bundle.get(ctor)

			if (plugin) this._attach(ctor, plugin)
		}

		const onUse = (ctor: TPluginCtor, plugin: IPlugin<any, any>) => this._attach(ctor, plugin)
		const onRemove = (ctor: TPluginCtor) => this._detach(ctor)

		bundle.events.on('use', onUse)
		bundle.events.on('remove', onRemove)

		this._off = () => {
			bundle.events.off('use', onUse)
			bundle.events.off('remove', onRemove)
		}
	}

	write(values: unknown): void {
		const next = valuesOf(values)

		for (const key of new Set([...Object.keys(this._values), ...Object.keys(next)])) {
			const value = next[key]

			if (Object.is(this._values[key], value)) continue

			const property = this._props.get(key)

			if (!property) continue

			if (value === undefined) property.reset()
			else property.assign(value)
		}

		this._values = next
	}

	destroy(): void {
		this._off()

		for (const ctor of [...this._attached.keys()]) this._detach(ctor)
	}

	private _attach(ctor: TPluginCtor, plugin: IPlugin<any, any>): void {
		if (this._own.has(ctor) || this._attached.has(ctor)) return

		const contract = pluginContractOf(ctor)

		if (!contract) return

		const keys: string[] = []

		for (const declaration of contract.props) {
			if (declaration.protected) continue

			const key = underscorePropNaming(declaration.name)
			const property = new TProperty(declaration, plugin)

			this._props.set(key, property)
			keys.push(key)

			property.initialize(this._values[key])
		}

		this._attached.set(ctor, { keys, off: this._forward(plugin, contract) })
	}

	private _detach(ctor: TPluginCtor): void {
		const attached = this._attached.get(ctor)

		if (!attached) return

		attached.off()

		for (const key of attached.keys) this._props.delete(key)

		this._attached.delete(ctor)
	}

	/**
	 * События плагина — явные и триггеры его пропсов — одним конвертом на шину
	 * инстанса. Один сырой триггер у двух пропсов пересылается один раз.
	 */
	private _forward(plugin: IPlugin<any, any>, contract: IPluginDefinition): () => void {
		const bus: unknown = Reflect.get(this._instance, 'events')
		const source: unknown = plugin.events

		if (!hasEmit(bus) || !isEventSource(source)) return () => {}

		const offs: Array<() => void> = []
		const seen = new Set<string>()

		const forward = (name: TName): void => {
			if (seen.has(name.name)) return

			seen.add(name.name)

			const handler = (...args: unknown[]) => {
				const event: TPluginEvent = { name: name.getName(), args }

				bus.emit('plugin:event', event)
			}

			source.on(name.name, handler)
			offs.push(() => source.off(name.name, handler))
		}

		for (const name of contract.events) forward(name)

		for (const declaration of contract.props) {
			for (const trigger of declaration.triggers ?? []) forward(trigger)
		}

		return () => offs.forEach((off) => off())
	}
}
