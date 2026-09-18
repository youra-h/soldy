/**
 * definePlugin — создаёт определение плагина.
 *
 * props/events нормализуются в TName с namespace из options.namespace. Пропы
 * получают умолчание — значение, с которым плагин стартует (`withPluginDefault`).
 */

import type { IContribution } from '@soldy/accessor'
import type { IPluginConstructor } from '@soldy/plugins'
import type { IPluginDefinition } from './types'
import { normalizeContribution } from './contribution'
import { withPluginDefault } from './defaults'

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
