/**
 * TPropSpec — неизменяемое описание свойства: одна запись на тип, которую делят все монтирования.
 *
 * Приспособленец (Flyweight): в описании нет ни владельца, ни памяти — только
 * то, что верно для типа. Но оно не анемично: как прочитать и как записать
 * свойство у владельца, знает само описание, поэтому `get`/`set` объявления
 * больше нигде не разбираются. Владельца к описанию приставляет линия обмена
 * (`TLine`) на время монтирования.
 *
 * **Умолчание: значим ключ, а не значение.** Поля `default` у описания нет
 * вовсе, пока умолчание не объявлено; `closable: undefined` у `TTabsItem` —
 * это «объявлено и равно `undefined`» («как у владельца»). Проверка
 * `default !== undefined` сломала бы этот случай молча, поэтому спрашивают
 * `hasDefault` (или `Object.hasOwn(spec, 'default')` — так читает стенд).
 *
 * Умолчание принадлежит классу владельца, а не объявлению, поэтому наследник
 * дескриптора и `with()` плагина получают своё описание — `rebase` и
 * `withDefault` возвращают новый объект, исходный не меняется: его делят
 * родитель и все, кто от него наследуется.
 */

import type { IPropDefinition } from './contribution.types'
import type { TName } from './name.class'

/** Составное значение пересекает границу снимком: свой `valueOf()` даёт новый простой объект. */
function snapshotOf(value: unknown): unknown {
	if (typeof value !== 'object' || value === null) return value

	return value.valueOf === Object.prototype.valueOf ? value : value.valueOf()
}

export class TPropSpec {
	readonly type: unknown
	readonly protected: boolean
	/** Ключ есть, только если умолчание объявлено. */
	declare readonly default?: unknown

	/**
	 * @param _definition объявление из contribution: из него берутся `get` и `set`
	 * @param defaults умолчания класса владельца; нет ключа с именем пропа — нет и умолчания
	 */
	constructor(
		readonly name: TName,
		readonly triggers: readonly TName[],
		private readonly _definition: IPropDefinition,
		defaults?: Readonly<Record<string, unknown>>,
	) {
		this.type = _definition.type
		this.protected = !!_definition.protected

		if (defaults && Object.hasOwn(defaults, name.name)) this.default = defaults[name.name]

		Object.freeze(this)
	}

	get hasDefault(): boolean {
		return Object.hasOwn(this, 'default')
	}

	/** Свои `get`/`set` объявления — для интроспекции; читать и писать надо через `read`/`assign`. */
	get get(): IPropDefinition['get'] {
		return this._definition.get
	}

	get set(): IPropDefinition['set'] {
		return this._definition.set
	}

	/** Прочитать у владельца: `get` объявления, а без него `owner[name]`; составное — снимком. */
	read(owner: object): unknown {
		const { get } = this._definition

		return snapshotOf(get ? get(owner) : Reflect.get(owner, this.name.name))
	}

	/** Записать владельцу: `set` объявления, а без него сеттер `owner[name]`. */
	assign(owner: object, value: unknown): void {
		const { set } = this._definition

		if (set) set(owner, value)
		else Reflect.set(owner, this.name.name, value)
	}

	/** То же описание с умолчанием от другого класса: наследник пересчитывает, а не копирует. */
	rebase(defaults: Readonly<Record<string, unknown>> | undefined): TPropSpec {
		return new TPropSpec(this.name, this.triggers, this._definition, defaults)
	}

	/** То же описание с заданным умолчанием: опция `with()` плагина идёт впереди умолчания класса. */
	withDefault(value: unknown): TPropSpec {
		return new TPropSpec(this.name, this.triggers, this._definition, {
			[this.name.name]: value,
		})
	}
}
