/**
 * TPluginDefinition — определение плагина: контракт класса и опции того места, где плагин поставили.
 *
 * Контракт один на класс плагина: пропсы, события и неймспейс объявляет
 * `definePlugin`, один раз, константой модуля. Опции — свойство использования:
 * `with(options)` отдаёт то же определение с опциями, а исходное не трогает —
 * его делят все дескрипторы, которые плагин ставят.
 *
 * Умолчание пропа плагина — значение, с которым плагин стартует: заданная
 * опция, иначе `defaultValues` класса. Опция впереди: плагин стартует с неё, и
 * отдай адаптеру умолчание класса — Vue при монтировании перетёр бы им опцию
 * автора дескриптора. Опция считается заданной, если она не `undefined`: так
 * её читает сам плагин (`options?.flip ?? …`). У `defaultValues` значим ключ —
 * см. `TPropSpec`.
 */

import type { TName } from './name.class'
import type { TPropSpec } from './prop-spec.class'
import type { IPluginContract, IPluginDefinition, TPluginCtor } from './types'

export class TPluginDefinition<C extends IPluginContract> implements IPluginDefinition<C> {
	declare readonly __contract?: C

	readonly props: readonly TPropSpec[]

	/**
	 * @param _specs пропсы contribution без умолчаний: умолчание зависит от опций
	 */
	constructor(
		readonly ctor: TPluginCtor,
		readonly namespace: string | undefined,
		private readonly _specs: readonly TPropSpec[],
		readonly events: readonly TName[],
		readonly options?: object,
	) {
		this.props = Object.freeze(_specs.map((spec) => this._withDefault(spec)))
	}

	/** Полный список пропсов — как у дескриптора: определение плагина тоже источник поверхности. */
	getProps(): readonly TPropSpec[] {
		return this.props
	}

	getEvents(): readonly TName[] {
		return this.events
	}

	with(options: C['options']): IPluginDefinition<C> {
		return new TPluginDefinition<C>(
			this.ctor,
			this.namespace,
			this._specs,
			this.events,
			options,
		)
	}

	private _withDefault(spec: TPropSpec): TPropSpec {
		const option: unknown = this.options ? Reflect.get(this.options, spec.name.name) : undefined

		return option === undefined
			? spec.rebase(this.ctor.defaultValues)
			: spec.withDefault(option)
	}
}
