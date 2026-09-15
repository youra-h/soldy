/**
 * definePlugin — создаёт определение плагина.
 * props/events нормализуются в TName с namespace из options.namespace.
 *
 * Пропы получают умолчание — значение, с которым плагин стартует: заданную
 * опцию дескриптора, иначе `defaultValues` плагина. Опция впереди: плагин
 * стартует с неё, и отдай адаптеру умолчание класса — Vue при монтировании
 * перетёр бы им опцию автора дескриптора.
 */

import type { IContribution, IPropDeclaration } from '@soldy/accessor'
import type { IPluginConstructor } from '@soldy/plugins'
import type { IPluginDefinition } from './types'
import { normalizeContribution } from './compile-contribution'
import { withClassDefault } from './prop-default'

/**
 * Умолчание пропа плагина.
 *
 * Опция считается заданной, если она не `undefined`: так её читает сам плагин
 * (`options?.flip ?? …`). У `defaultValues` значим ключ — см. `withClassDefault`.
 */
function withPluginDefault(
	prop: IPropDeclaration,
	ctor: IPluginConstructor<any, any, any>,
	options: object | undefined,
): IPropDeclaration {
	const option: unknown = options ? Reflect.get(options, prop.name.name) : undefined

	if (option === undefined) return withClassDefault(prop, ctor.defaultValues)

	return { ...prop, default: option }
}

export function definePlugin<
	N extends string | undefined = undefined,
	TEvents extends object = object,
	TProps extends object = object,
>(options: {
	ctor: IPluginConstructor<any, any, any>
	namespace?: N
	contribution?: IContribution
	options?: object
}): IPluginDefinition<N, TEvents, TProps> {
	const { props, events } = normalizeContribution(options.contribution, options.namespace)

	return {
		ctor: options.ctor,
		props: props.map((prop) => withPluginDefault(prop, options.ctor, options.options)),
		events,
		options: options.options,
		namespace: options.namespace,
	}
}
