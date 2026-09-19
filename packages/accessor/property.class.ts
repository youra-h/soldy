/**
 * TProperty — свойство компонента вместе с владельцем: чтение, запись и слежение за одним свойством.
 *
 * Декларация говорит, что это за свойство (имя, триггеры, умолчание, свои
 * `get`/`set`), владелец — где оно живёт: инстанс ядра или плагин. Вместе они
 * отвечают на всё, что у свойства спрашивают сборка и связка с фреймворком,
 * поэтому правило записи у свойства одно, а не своё у каждого, кто пишет:
 *
 * - защищённое свойство снаружи не пишется — его вычисляет владелец;
 * - то же значение не пишется: сеттер, эмитящий и на том же значении, замкнул
 *   бы цикл через колбэки событий;
 * - снятое значение возвращается к умолчанию декларации (`reset`); без
 *   объявленного умолчания возвращаться не к чему, и значение остаётся;
 * - начальное значение, равное умолчанию, ничего не задаёт (`initialize`): так
 *   внешний инстанс сохраняет своё состояние, даже если фреймворк подставил
 *   умолчание за автора.
 *
 * У умолчания значим ключ, а не значение — см. `IPropDeclaration.default`.
 */

import { isEventSource, type IEventSource } from '@soldy/core'
import type { IPropDeclaration, TName } from './contract'

/** Шина событий владельца: `instance.events`, а без неё сам владелец. Не шина — слушать нечего. */
export function eventSourceOf(instance: object): IEventSource | undefined {
	const events: unknown = Reflect.get(instance, 'events')
	const source = events ?? instance

	return isEventSource(source) ? source : undefined
}

export class TProperty {
	constructor(
		readonly declaration: IPropDeclaration,
		/** Владелец: `instance[name]` — значение, `instance.events` — источник событий. */
		readonly instance: object,
	) {}

	get name(): TName {
		return this.declaration.name
	}

	/** Свойство вычисляет владелец: снаружи его только читают. */
	get protected(): boolean {
		return !!this.declaration.protected
	}

	get triggers(): readonly TName[] {
		return this.declaration.triggers ?? []
	}

	get source(): IEventSource | undefined {
		return eventSourceOf(this.instance)
	}

	/** Умолчание объявлено — в том числе значением `undefined`. */
	get hasDefault(): boolean {
		return Object.hasOwn(this.declaration, 'default')
	}

	/** `get` декларации, а без него `instance[name]`; составное значение — снимком `valueOf()`. */
	get value(): unknown {
		if (this.declaration.get) return this.declaration.get(this.instance)

		const value: unknown = Reflect.get(this.instance, this.name.name)

		if (typeof value === 'object' && value !== null && typeof value.valueOf === 'function') {
			return value.valueOf() ?? value
		}

		return value
	}

	/** Записать значение: `set` декларации, а без него `instance[name] = value`. */
	assign(value: unknown): void {
		if (this.protected || Object.is(this.value, value)) return

		if (this.declaration.set) {
			this.declaration.set(this.instance, value)

			return
		}

		if (this.name.name in this.instance) Reflect.set(this.instance, this.name.name, value)
	}

	/** Вернуть умолчание декларации; не объявлено — значение остаётся. */
	reset(): void {
		if (this.hasDefault) this.assign(this.declaration.default)
	}

	/** Начальное значение: не заданное (`undefined`) и равное умолчанию ничего не задают. */
	initialize(value: unknown): void {
		if (value === undefined) return
		if (this.hasDefault && Object.is(value, this.declaration.default)) return

		this.assign(value)
	}

	/** Слушать триггеры свойства на шине владельца. Возвращает отписку. */
	watch(listener: () => void): () => void {
		const source = this.source

		if (!source) return () => {}

		for (const trigger of this.triggers) source.on(trigger.name, listener)

		return () => {
			for (const trigger of this.triggers) source.off(trigger.name, listener)
		}
	}
}
