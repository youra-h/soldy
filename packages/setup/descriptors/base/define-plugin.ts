/**
 * definePlugin — создаёт определение плагина.
 * props/events нормализуются в TName с namespace из ctor.namespace.
 */

import type { IContribution } from '@soldy/accessor'
import type { IPluginConstructor } from '@soldy/plugins'
import type { IPluginDefinition } from './types'
import { normalizeContribution } from './compile-contribution'

export function definePlugin(options: {
	ctor: IPluginConstructor<any, any, any>
	contribution?: IContribution
	options?: Record<string, any>
}): IPluginDefinition {
	const ns = (options.ctor as any).namespace?.description || undefined
	const { props, events } = normalizeContribution(options.contribution, ns)

	return {
		ctor: options.ctor,
		props,
		events,
		options: options.options,
	}
}
