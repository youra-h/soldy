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
 * Связка помнит, какие пропсы фреймворк задал, и последнее значение каждого.
 * Без этой памяти `undefined` неотличим: «проп не передан» и «проп сняли».
 * Первое должно оставить состояние инстанса как есть (внешний `ctrl`), второе
 * — вернуть проп к умолчанию декларации: у трёхзначных пропсов (`closable`
 * элемента Tabs, `contentFit` элемента ListBox) умолчание `undefined` и значит
 * «как у владельца», и без сброса к нему компонент оставался с прежним
 * значением.
 *
 * По той же памяти `writeAll` отличает сменившийся проп от повторённого.
 * React, Solid и Svelte отдают полный набор пропсов на каждом проходе, и
 * запись каждого откатила бы к разметке то, что с тех пор поменяли ядро или
 * код через инстанс: список, открытый кликом при переданном `open={false}`,
 * закрылся бы от смены плейсхолдера. Vue, Angular и Web Components сообщают
 * только об изменившемся, так что во всех шести адаптерах в ядро пишется лишь
 * то, что поменял фреймворк.
 *
 * Начальные значения пишет не связка, а сборка контекста (`applyInitialProps`).
 * Память начинается с пропсов, с которыми контекст собран: первый проход
 * фреймворка сверяется с ними и пишет только сменившееся с тех пор.
 *
 * Обратное направление — хранилище: `subscribe` и `getSnapshot`. Путь у
 * значения из ядра один. Сработал триггер — связка перечитывает свойство и
 * отдаёт его подписчикам. Подписался фреймворк при монтировании — связка
 * делает то же самое для каждого свойства: перечитывает и отдаёт. Отдельного
 * «стартового состояния» у адаптера нет, и порядок — сначала подписка на
 * триггеры, потом чтение — держит связка, а не цикл фреймворка. Раньше
 * адаптер сам брал снимок и сам выбирал, когда подписаться: React и Svelte
 * подписывались в эффекте, и изменение ядра между рендером и эффектом до них
 * не доходило.
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
	TBindingSnapshot,
	TEventEmitter,
	TOutputWriter,
} from './types'

/** Простой объект или массив — снимок составного свойства (`valueOf()`), а не инстанс. */
function isPlain(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null) return false

	const proto: unknown = Object.getPrototypeOf(value)

	return proto === Object.prototype || proto === Array.prototype || proto === null
}

/**
 * То же значение для фреймворка. Составные свойства отдают новый снимок на
 * каждое чтение (`TClasses`, наборы `aria`/`attrs`/`dataset`, состав
 * коллекции), поэтому их сверяем поверхностно: иначе каждое чтение выглядело
 * бы изменением, и монтирование перерисовывало бы компонент впустую.
 */
function sameValue(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true
	if (!isPlain(a) || !isPlain(b) || Array.isArray(a) !== Array.isArray(b)) return false

	const keys = Object.keys(a)

	return (
		keys.length === Object.keys(b).length &&
		keys.every((key) => Object.hasOwn(b, key) && Object.is(a[key], b[key]))
	)
}

export class TComponentBinding implements IComponentBinding {
	readonly surface: ISurface

	private readonly _accessor: TAccessor
	/** Свойства поверхности, у которых в аксессоре есть владелец. */
	private readonly _targets = new Map<ISurfaceProp, IAccessorProp>()
	/**
	 * Состояние для фреймворка — свойства с триггерами. Без триггеров свойство
	 * pass-through (`ctrl`): следить за ним нечем.
	 */
	private readonly _state = new Map<ISurfaceProp, IAccessorProp>()
	private readonly _events = new Map<string, IAccessorEvent>()
	/**
	 * Заданные входы — пропсами сборки или фреймворком после неё — и последнее
	 * значение каждого, не `undefined`. Нет ключа — вход не задан: не
	 * передавали или сняли.
	 */
	private readonly _assigned = new Map<ISurfaceProp, unknown>()
	private readonly _listeners = new Set<TOutputWriter>()
	private _snapshot: TBindingSnapshot = {}
	/** Отписка от триггеров ядра; есть, пока есть подписчики. */
	private _disconnect: (() => void) | null = null

	constructor(context: IAdapterContext, profile: IAdapterProfile) {
		this.surface = surfaceOf(context.descriptor, profile)
		this._accessor = context.accessor

		for (const prop of this.surface.inputs) {
			const value = this.read(prop, context.props)

			if (value !== undefined) this._assigned.set(prop, value)
		}

		// Свойство плагина, которого нет в наборе (фасад на чужом наборе),
		// аксессор не собрал: связка его пропускает
		const props = new Map(
			this._accessor.getProps(true).map((prop) => [prop.name.getName(), prop]),
		)

		// Снимок до подписки нужен тем, кто рисует раньше, чем подписывается:
		// React рендерит по нему, а подписка сверит его с ядром
		const snapshot: Record<string, unknown> = {}

		for (const prop of this.surface.props) {
			const target = props.get(prop.key)

			if (!target) continue

			this._targets.set(prop, target)

			if (prop.triggers.length === 0) continue

			this._state.set(prop, target)
			snapshot[prop.exportName] = this._accessor.getValue(target)
		}

		this._snapshot = snapshot

		for (const event of this._accessor.getEvents()) {
			this._events.set(event.name.getName(), event)
		}
	}

	/** Стрелка, а не метод: фреймворк передаёт её дальше без `this` (`useSyncExternalStore`). */
	readonly getSnapshot = (): TBindingSnapshot => this._snapshot

	/** Стрелка, а не метод — по той же причине, что `getSnapshot`. */
	readonly subscribe = (listener: TOutputWriter): (() => void) => {
		// Сначала подписка на триггеры, потом чтение: изменение между ними не теряется
		this._disconnect ??= this._connect()
		this._listeners.add(listener)

		// Монтирование — то же, что срабатывание триггера у каждого свойства
		for (const prop of this._state.keys()) this._refresh(prop, listener)

		return () => {
			this._listeners.delete(listener)

			if (this._listeners.size > 0) return

			this._disconnect?.()
			this._disconnect = null
		}
	}

	/**
	 * Дедупликация — по паре «источник, сырое имя»: один триггер объявлен у
	 * нескольких свойств (`present` повторяет триггеры `rendered` и
	 * `visible`), и без неё потребитель получал бы два эмита на одно изменение.
	 * Дедуплицировать можно только проброс событий: состояние (`subscribe`)
	 * обязано пересчитать каждое свойство.
	 *
	 * Событие модели (`update:<prop>` у Vue, `ISurface.models`) — после
	 * событий ядра: на один триггер сначала уходит событие, потом новое
	 * значение для `v-model`. Как и событие, наружу оно уходит только на
	 * изменение, а не при монтировании.
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

		// 3. Модель: новое значение свойства — после события ядра
		for (const model of this.surface.models) {
			const target = this._targets.get(model.prop)
			const source = target ? this._accessor.getEventSource(target) : undefined

			if (!target || !source) continue

			const handler = () => emit(model.exportName, [this._accessor.getValue(target)])

			for (const trigger of model.prop.triggers) {
				source.on(trigger.raw, handler)
				offs.push(() => source.off(trigger.raw, handler))
			}
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

		// Заданным вход становится до guard'а «то же значение»: значение может уже
		// лежать в ядре, а снятый потом проп всё равно должен вернуться к умолчанию
		this._assigned.set(prop, value)
		this._set(target, value)
	}

	writeAll(props: object): void {
		for (const prop of this.surface.inputs) {
			const value = this.read(prop, props)

			// Прошлое значение повторилось — проп не менялся: запись откатила бы
			// то, что с тех пор поменяли ядро или код через инстанс. У незаданного
			// входа прошлое значение — `undefined`: снова не передан, снова не пишется
			if (Object.is(this._assigned.get(prop), value)) continue

			this.write(prop, value)
		}
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

	/** Подписка на триггеры состояния: на каждый — перечитать своё свойство. */
	private _connect(): () => void {
		const offs: Array<() => void> = []

		for (const [prop, target] of this._state) {
			const source = this._accessor.getEventSource(target)

			if (!source) continue

			const handler = () => this._refresh(prop)

			for (const trigger of prop.triggers) {
				source.on(trigger.raw, handler)
				offs.push(() => source.off(trigger.raw, handler))
			}
		}

		return () => offs.forEach((off) => off())
	}

	/**
	 * Перечитать свойство из ядра и отдать подписчикам — один путь на триггер и
	 * на монтирование.
	 *
	 * Свежесть значения — ответственность ядра: составные свойства отдают
	 * снимок через valueOf() (TClasses, драйвер коллекции) либо заменяются
	 * целиком (layout-плагины). Связка не угадывает.
	 *
	 * Сменилось значение — снимок заменяется новым объектом и узнают все
	 * подписчики. `mounting` — новый подписчик: он получает значение в любом
	 * случае, это его начальное состояние.
	 */
	private _refresh(prop: ISurfaceProp, mounting?: TOutputWriter): void {
		const target = this._state.get(prop)

		if (!target) return

		const name = prop.exportName
		const value = this._accessor.getValue(target)
		const changed = !sameValue(this._snapshot[name], value)

		if (changed) this._snapshot = { ...this._snapshot, [name]: value }

		const current = this._snapshot[name]

		if (changed) {
			for (const listener of this._listeners) listener(prop, current)
		} else {
			mounting?.(prop, current)
		}
	}
}

/** Связать контекст адаптера с фреймворком профиля. */
export function bindComponent(
	context: IAdapterContext,
	profile: IAdapterProfile,
): IComponentBinding {
	return new TComponentBinding(context, profile)
}
