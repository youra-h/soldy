/**
 * definePlugin — создаёт определение плагина.
 * props/events нормализуются в TName с namespace из options.namespace.
 */

import type { IContribution } from '@soldy/accessor'
import type { IPluginConstructor } from '@soldy/plugins'
import type { IPluginDefinition } from './types'
import { normalizeContribution } from './compile-contribution'

export function definePlugin<N extends string | undefined = undefined>(options: {
	ctor: IPluginConstructor<any, any, any>
	namespace?: N
	contribution?: IContribution
	options?: Record<string, any>
}): IPluginDefinition<N> {
	const { props, events } = normalizeContribution(options.contribution, options.namespace)

	return {
		ctor: options.ctor,
		props,
		events,
		options: options.options,
		namespace: options.namespace,
	}
}
