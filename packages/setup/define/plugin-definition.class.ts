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
 * см. `withClassDefault`.
 */

import type { IPropDeclaration, TName } from '@soldy/accessor'
import { withClassDefault } from './defaults'
import type { IPluginContract, IPluginDefinition, TPluginCtor } from './types'

export class TPluginDefinition<C extends IPluginContract> implements IPluginDefinition<C> {
	declare readonly __contract?: C

	readonly props: readonly IPropDeclaration[]

	/**
	 * @param declarations пропсы contribution без умолчаний: умолчание зависит от опций
	 */
	constructor(
		readonly ctor: TPluginCtor,
		readonly namespace: string | undefined,
		private readonly _declarations: readonly IPropDeclaration[],
		readonly events: readonly TName[],
		readonly options?: object,
	) {
		this.props = _declarations.map((declaration) => this._withDefault(declaration))
	}

	with(options: C['options']): IPluginDefinition<C> {
		return new TPluginDefinition<C>(
			this.ctor,
			this.namespace,
			this._declarations,
			this.events,
			options,
		)
	}

	private _withDefault(declaration: IPropDeclaration): IPropDeclaration {
		const option: unknown = this.options
			? Reflect.get(this.options, declaration.name.name)
			: undefined

		if (option === undefined) return withClassDefault(declaration, this.ctor.defaultValues)

		return { ...declaration, default: option }
	}
}
