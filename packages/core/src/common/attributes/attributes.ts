import { TEvented } from '../event/evented'
import type { TAttributesMap, TAttributesEvents } from './types'

/**
 * Живой набор атрибутов вида `имя → значение`.
 *
 * База для `TAria` и `TData`. Общее у них не только хранилище: одинаковы
 * семантика `null` (снять атрибут), правило «эмитить только при настоящем
 * изменении» и — важнее всего — снимок через `valueOf()`.
 *
 * Снимок здесь не удобство, а контракт границы core → ui: адаптер узнаёт об
 * изменении по смене идентичности значения, поэтому за границу обязан уходить
 * новый объект, а не ссылка на состояние. Продублируй эту механику во втором
 * классе — и однажды один из двух наборов перестанет доезжать до разметки,
 * причём молча.
 *
 * Хранит значения, а не функции. Вычисляемых записей нет намеренно: их
 * свежесть зависела бы от того, вспомнил ли кто-то перечислить источники в
 * триггерах пропа. Здесь триггер один и срабатывает ровно тогда, когда набор
 * действительно изменился.
 *
 * Наследники добавляют то, что у них своё: `TData` — префикс и приведение
 * типов, `TAria` — исключения вроде `role` и `tabindex`, которые лежат в
 * наборе, хотя и не начинаются на `aria-`.
 */
export class TAttributes {
	protected _map: Map<string, string> = new Map()

	/** `change` — при любом изменении набора. */
	readonly events = new TEvented<TAttributesEvents>()

	constructor(initial: TAttributesMap = {}) {
		for (const [name, value] of Object.entries(initial)) {
			if (value === null) continue

			this._map.set(this.resolve(name), value)
		}
	}

	/**
	 * Приводит имя к каноническому виду. База не меняет ничего; `TData`
	 * подставляет здесь префикс `data-`.
	 */
	protected resolve(name: string): string {
		return name
	}

	/**
	 * Ставит атрибут. `null` и `undefined` его снимают — это позволяет писать
	 * `add('aria-disabled', disabled ? 'true' : null)` вместо ветвления на
	 * каждом вызове.
	 *
	 * Эмитит `change`, только если набор действительно изменился.
	 */
	add(name: string, value: string | null | undefined): this {
		if (value === null || value === undefined) return this.remove(name)

		const key = this.resolve(name)

		if (this._map.get(key) === value) return this

		this._map.set(key, value)
		this.events.emit('change')

		return this
	}

	/** Снимает атрибут. Эмитит `change`, если он был. */
	remove(name: string): this {
		if (!this._map.delete(this.resolve(name))) return this

		this.events.emit('change')

		return this
	}

	/** Значение атрибута или `undefined`. */
	get(name: string): string | undefined {
		return this._map.get(this.resolve(name))
	}

	/** Стоит ли атрибут. */
	has(name: string): boolean {
		return this._map.has(this.resolve(name))
	}

	/** Имена всех выставленных атрибутов — уже канонические. */
	get names(): string[] {
		return [...this._map.keys()]
	}

	/**
	 * Снимок набора — обычный объект для разметки.
	 *
	 * Новый объект на каждое чтение: за границу core → ui уходит значение, а
	 * не ссылка на состояние. Иначе потребитель мог бы незаметно его испортить.
	 */
	toObject(): TAttributesMap {
		return Object.fromEntries(this._map)
	}

	/** Тот же снимок. Вызывается адаптером автоматически при чтении пропа. */
	valueOf(): TAttributesMap {
		return this.toObject()
	}
}
