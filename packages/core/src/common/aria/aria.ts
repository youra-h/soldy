import { TEvented } from '../event/evented'
import type { TAriaAttributes, TAriaEvents } from './types'

/**
 * Набор атрибутов доступности компонента.
 *
 * Устроен как `TClasses`: живой объект в `TComponentView`, доступный
 * наследникам, плагинам и расширениям коллекции. Каждый пишет свою часть
 * туда же, а разметка биндит один набор — `v-bind="aria"`.
 *
 * Почему не спред нескольких наборов. Так было раньше, и у элемента таба
 * в одном `v-bind` уже сходились четыре источника: роль от ядра, связка с
 * панелью от расширения, активность от коллекции, имя от плагина. Каждый
 * новый ARIA-паттерн добавлял туда ещё один — собирать это в разметке шести
 * адаптеров невозможно.
 *
 * Хранит значения, а не функции. Вычисляемых записей нет намеренно: их
 * свежесть зависела бы от того, вспомнил ли кто-то перечислить их источники
 * в триггерах пропа. Здесь триггер один — `change:aria`, и он срабатывает
 * ровно тогда, когда набор действительно изменился.
 */
export class TAria {
	private _map: Map<string, string> = new Map()

	/** `change` — при любом изменении набора. */
	readonly events = new TEvented<TAriaEvents>()

	constructor(initial: TAriaAttributes = {}) {
		for (const [name, value] of Object.entries(initial)) {
			if (value === null) continue

			this._map.set(name, value)
		}
	}

	/**
	 * Ставит атрибут. `null` и `undefined` его снимают — это позволяет писать
	 * `add('aria-disabled', disabled ? 'true' : null)` вместо ветвления
	 * на каждом вызове.
	 *
	 * Эмитит `change`, только если набор действительно изменился.
	 */
	add(name: string, value: string | null | undefined): this {
		if (value === null || value === undefined) return this.remove(name)

		if (this._map.get(name) === value) return this

		this._map.set(name, value)
		this.events.emit('change')

		return this
	}

	/** Снимает атрибут. Эмитит `change`, если он был. */
	remove(name: string): this {
		if (!this._map.delete(name)) return this

		this.events.emit('change')

		return this
	}

	/** Значение атрибута или `undefined`. */
	get(name: string): string | undefined {
		return this._map.get(name)
	}

	/** Стоит ли атрибут. */
	has(name: string): boolean {
		return this._map.has(name)
	}

	/** Имена всех выставленных атрибутов. */
	get names(): string[] {
		return [...this._map.keys()]
	}

	/**
	 * Снимок набора — обычный объект для разметки.
	 *
	 * Новый объект на каждое чтение: за границу core → ui уходит значение, а
	 * не ссылка на состояние. Иначе потребитель мог бы незаметно его испортить.
	 */
	toObject(): TAriaAttributes {
		return Object.fromEntries(this._map)
	}

	/** Тот же снимок. Вызывается адаптером автоматически при чтении пропа. */
	valueOf(): TAriaAttributes {
		return this.toObject()
	}
}
