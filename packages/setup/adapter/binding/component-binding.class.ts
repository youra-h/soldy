/**
 * TComponentBinding — связка компонента с фреймворком на одно монтирование.
 *
 * Поверхность (`surfaceOf`) знает имена, аксессор контекста — владельцев
 * свойств и их `get`/`set`. Связка соединяет одно с другим один раз при
 * монтировании, и дальше адаптеру остаётся сказать, куда писать значение и как
 * отдать событие наружу.
 *
 * До неё тот же код — подписки на триггеры, дедупликация событий, чтение
 * пропсов по двум именам, guard от записи того же значения — был написан в
 * каждом из шести адаптеров, и различался одной строкой записи.
 *
 * Связка помнит, какие пропсы фреймворк задал. Без этой памяти `undefined`
 * неотличим: «проп не передан» и «проп сняли». Первое должно оставить
 * состояние инстанса как есть (внешний `ctrl`), второе — вернуть проп к
 * умолчанию декларации: у трёхзначных пропсов (`closable` элемента Tabs,
 * `contentFit` элемента ListBox) умолчание `undefined` и значит «как у
 * владельца», и без сброса к нему компонент оставался с прежним значением.
 */

import type { IEventSource } from '@soldy/core'
import type { IAccessorEvent, IAccessorProp, TAccessor } from '@soldy/accessor'
import type { IAdapterContext } from '../context'
import { surfaceOf } from './surface'
import type {
	IAdapterProfile,
	IComponentBinding,
	ISurface,
	ISurfaceProp,
	TEventEmitter,
	TOutputWriter,
} from './types'

export class TComponentBinding implements IComponentBinding {
	readonly surface: ISurface

	private readonly _accessor: TAccessor
	/** Свойства поверхности, у которых в аксессоре есть владелец. */
	private readonly _targets = new Map<ISurfaceProp, IAccessorProp>()
	private readonly _events = new Map<string, IAccessorEvent>()
	/** Входы, которые фреймворк задал: последнее записанное значение — не `undefined`. */
	private readonly _assigned = new Set<ISurfaceProp>()

	constructor(context: IAdapterContext, profile: IAdapterProfile) {
		this.surface = surfaceOf(context.descriptor, profile)
		this._accessor = context.accessor

		// Свойство плагина, которого нет в наборе (фасад на чужом наборе),
		// аксессор не собрал: связка его пропускает
		const props = new Map(
			this._accessor.getProps(true).map((prop) => [prop.name.getName(), prop]),
		)

		for (const prop of this.surface.props) {
			const target = props.get(prop.key)

			if (target) this._targets.set(prop, target)
		}

		for (const event of this._accessor.getEvents()) {
			this._events.set(event.name.getName(), event)
		}
	}

	state(): Record<string, unknown> {
		const state: Record<string, unknown> = {}

		for (const [prop, target] of this._targets) {
			// Свойство без триггеров — pass-through (`ctrl`): следить за ним нечем
			if (prop.triggers.length > 0) state[prop.exportName] = this._accessor.getValue(target)
		}

		return state
	}

	bindOutput(write: TOutputWriter): () => void {
		const offs: Array<() => void> = []

		for (const [prop, target] of this._targets) {
			if (prop.triggers.length === 0) continue

			const source = this._accessor.getEventSource(target)

			if (!source) continue

			for (const trigger of prop.triggers) {
				// Свежесть значения — ответственность ядра: составные свойства
				// отдают снимок через valueOf() (TClasses, драйвер коллекции)
				// либо заменяются целиком (layout-плагины). Связка не угадывает.
				const handler = () => write(prop, this._accessor.getValue(target))

				source.on(trigger.raw, handler)
				offs.push(() => source.off(trigger.raw, handler))
			}
		}

		return () => offs.forEach((off) => off())
	}

	/**
	 * Дедупликация — по паре «источник, сырое имя»: один триггер объявлен у
	 * нескольких свойств (`present` повторяет триггеры `rendered` и
	 * `visible`), и без неё потребитель получал бы два эмита на одно изменение.
	 * Дедуплицировать можно только проброс событий: синхронизация состояния
	 * (`bindOutput`) обязана пересчитать каждое свойство.
	 */
	bindEvents(emit: TEventEmitter): () => void {
		const offs: Array<() => void> = []
		const seen = new Map<IEventSource, Set<string>>()

		const listen = (source: IEventSource, raw: string, exportName: string): void => {
			let names = seen.get(source)

			if (!names) {
				names = new Set()
				seen.set(source, names)
			}

			if (names.has(raw)) return

			names.add(raw)

			const handler = (...args: unknown[]) => emit(exportName, args)

			source.on(raw, handler)
			offs.push(() => source.off(raw, handler))
		}

		// 1. Триггеры свойств, protected включительно — они тоже сигнализируют наружу
		for (const [prop, target] of this._targets) {
			const source = this._accessor.getEventSource(target)

			if (!source) continue

			for (const trigger of prop.triggers) listen(source, trigger.raw, trigger.exportName)
		}

		// 2. Явные события
		for (const event of this.surface.events) {
			const target = this._events.get(event.key)
			const source = target ? this._accessor.getEventSource(target) : undefined

			if (source) listen(source, event.raw, event.exportName)
		}

		return () => offs.forEach((off) => off())
	}

	read(prop: ISurfaceProp, props: object): unknown {
		return Reflect.get(props, prop.exportName) ?? Reflect.get(props, prop.name.name)
	}

	write(prop: ISurfaceProp, value: unknown): void {
		const target = prop.protected ? undefined : this._targets.get(prop)

		if (!target) return

		if (value === undefined) {
			this._reset(prop, target)

			return
		}

		// Заданным вход становится до guard'а «то же значение»: на первом проходе
		// значение уже лежит в инстансе, собранном из тех же пропсов
		this._assigned.add(prop)
		this._set(target, value)
	}

	writeAll(props: object): void {
		for (const prop of this.surface.inputs) this.write(prop, this.read(prop, props))
	}

	writeChanged(changes: object): void {
		for (const prop of this.surface.inputs) {
			if (Object.hasOwn(changes, prop.exportName) || Object.hasOwn(changes, prop.name.name)) {
				this.write(prop, this.read(prop, changes))
			}
		}
	}

	forward<TProps extends object>(props: TProps): Partial<TProps> {
		const rest: Partial<TProps> = {}

		for (const key of Object.keys(props)) {
			if (!this.surface.consumed.has(key)) Reflect.set(rest, key, Reflect.get(props, key))
		}

		return rest
	}

	/**
	 * Проп сняли — вернуть умолчание декларации.
	 *
	 * Не задавали — `undefined` значит «не передан», и состояние инстанса не
	 * трогается. Умолчания нет (`items`, `mode` фасадов коллекций) — сбрасывать
	 * не к чему: `undefined` их сеттеры не принимают.
	 */
	private _reset(prop: ISurfaceProp, target: IAccessorProp): void {
		if (!this._assigned.delete(prop) || !Object.hasOwn(prop, 'default')) return

		this._set(target, prop.default)
	}

	private _set(target: IAccessorProp, value: unknown): void {
		if (this._accessor.getValue(target) === value) return

		this._accessor.setValue(target, value)
	}
}

/** Связать контекст адаптера с фреймворком профиля. */
export function bindComponent(
	context: IAdapterContext,
	profile: IAdapterProfile,
): IComponentBinding {
	return new TComponentBinding(context, profile)
}
