/**
 * TComponentBinding — связка компонента с фреймворком на одно монтирование.
 *
 * Поверхность (`surfaceOf`) знает имена, аксессор контекста — владельцев
 * свойств. Связка соединяет одно с другим один раз при монтировании и раздаёт
 * пары «свойство поверхности — свойство аксессора» трём объектам, по одному на
 * направление:
 *
 * - `TStateStore` — ядро → фреймворк: состояние хранилищем (`subscribe`,
 *   `getSnapshot`);
 * - `TInputWriter` — фреймворк → ядро: входные пропсы, только сменившиеся
 *   (`write`, `writeAll`, `writeChanged`);
 * - события наружу без повторов (`bindEvents`, `TEventRelay`).
 *
 * Сама связка — фасад: адаптеру остаётся сказать, куда писать значение и как
 * отдать событие, и решить, в какой момент своего цикла это делать. До неё тот
 * же код — подписки на триггеры, дедупликация событий, чтение пропсов по двум
 * именам, guard от записи того же значения — был написан в каждом из шести
 * адаптеров, и различался одной строкой записи.
 */

import { TEventRelay } from '@soldy/accessor'
import type { IAccessorEvent, TProperty } from '@soldy/accessor'
import { PLUGIN_PROPS } from '../../naming'
import type { IAdapterContext } from '../context'
import { TInputWriter } from './input-writer.class'
import { TStateStore } from './state-store.class'
import { surfaceOf } from './surface'
import type {
	IAdapterProfile,
	IComponentBinding,
	IInputSink,
	ISurface,
	ISurfaceProp,
	TBindingSnapshot,
	TEventEmitter,
	TOutputWriter,
} from './types'

export class TComponentBinding implements IComponentBinding {
	readonly surface: ISurface
	readonly getSnapshot: () => TBindingSnapshot
	readonly subscribe: (listener: TOutputWriter) => () => void

	/** Свойства поверхности, у которых в аксессоре есть владелец. */
	private readonly _properties = new Map<ISurfaceProp, TProperty>()
	private readonly _events = new Map<string, IAccessorEvent>()
	private readonly _inputs: TInputWriter

	constructor(context: IAdapterContext, profile: IAdapterProfile) {
		this.surface = surfaceOf(context.descriptor, profile)

		// Свойство плагина, которого нет в наборе (фасад на чужом наборе),
		// аксессор не собрал: связка его пропускает
		const owned = new Map(
			context.accessor.getProps(true).map((property) => [property.name.getName(), property]),
		)

		for (const prop of this.surface.props) {
			const property = owned.get(prop.key)

			if (property) this._properties.set(prop, property)
		}

		for (const event of context.accessor.getEvents()) {
			this._events.set(event.name.getName(), event)
		}

		// Значения для плагинов снаружи разбирают плагины монтирования: они знают,
		// что сейчас в наборе, а связка — только поверхность компонента
		const plugins: IInputSink = {
			assign: (value) => context.writePluginProps(value),
			reset: () => context.writePluginProps(undefined),
		}
		const sinks = new Map<ISurfaceProp, IInputSink>()

		for (const prop of this.surface.inputs) {
			const sink = prop.key === PLUGIN_PROPS ? plugins : this._properties.get(prop)

			if (sink) sinks.set(prop, sink)
		}

		this._inputs = new TInputWriter(sinks, context.props)

		const state = new TStateStore(this._properties)

		// Фреймворк передаёт их дальше без `this` (`useSyncExternalStore`)
		this.getSnapshot = state.getSnapshot
		this.subscribe = state.subscribe
	}

	/**
	 * Без повторов — по паре «источник, сырое имя»: один триггер объявлен у
	 * нескольких свойств (`present` повторяет триггеры `rendered` и
	 * `visible`), и без этого потребитель получал бы два эмита на одно
	 * изменение. Пропускать повторы можно только у проброса событий: состояние
	 * (`subscribe`) обязано пересчитать каждое свойство.
	 *
	 * Событие модели (`update:<prop>` у Vue, `ISurface.models`) — после
	 * событий ядра: на один триггер сначала уходит событие, потом новое
	 * значение для `v-model`. Как и событие, наружу оно уходит только на
	 * изменение, а не при монтировании.
	 */
	bindEvents(emit: TEventEmitter): () => void {
		const relay = new TEventRelay()

		// 1. Триггеры свойств, protected включительно — они тоже сигнализируют наружу
		for (const [prop, property] of this._properties) {
			const source = property.source

			if (!source) continue

			for (const trigger of prop.triggers) {
				relay.listen(source, trigger.raw, (...args) => emit(trigger.exportName, args))
			}
		}

		// 2. Явные события
		for (const event of this.surface.events) {
			const source = this._events.get(event.key)?.source

			if (source) relay.listen(source, event.raw, (...args) => emit(event.exportName, args))
		}

		// 3. Модель: новое значение свойства — после события ядра
		for (const model of this.surface.models) {
			const property = this._properties.get(model.prop)

			if (property) {
				relay.add(property.watch(() => emit(model.exportName, [property.value])))
			}
		}

		return () => relay.stop()
	}

	read(prop: ISurfaceProp, props: object): unknown {
		return this._inputs.read(prop, props)
	}

	write(prop: ISurfaceProp, value: unknown): void {
		this._inputs.write(prop, value)
	}

	writeAll(props: object): void {
		this._inputs.writeAll(props)
	}

	writeChanged(changes: object): void {
		this._inputs.writeChanged(changes)
	}

	forward<TProps extends object>(props: TProps): Partial<TProps> {
		const rest: Partial<TProps> = {}

		for (const key of Object.keys(props)) {
			if (!this.surface.consumed.has(key)) Reflect.set(rest, key, Reflect.get(props, key))
		}

		return rest
	}
}

/** Связать контекст адаптера с фреймворком профиля. */
export function bindComponent(
	context: IAdapterContext,
	profile: IAdapterProfile,
): IComponentBinding {
	return new TComponentBinding(context, profile)
}
