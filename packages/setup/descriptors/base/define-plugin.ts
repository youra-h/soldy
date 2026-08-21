/**
 * definePlugin — создаёт определение плагина.
 * props/events нормализуются из contribution при определении.
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
	const { props, events } = normalizeContribution(options.contribution)

	return {
		ctor: options.ctor,
		props,
		events,
		options: options.options,
	}
}
