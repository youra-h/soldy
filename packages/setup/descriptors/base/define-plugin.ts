/**
 * definePlugin — создаёт определение плагина.
 * Namespace берётся из статического поля ctor.namespace (symbol).
 * Строковое представление — из description символа.
 */

import type { IContribution } from '@soldy/accessor'
import type { IPluginConstructor } from '@soldy/plugins'
import type { IPluginDefinition } from './types'

export function definePlugin(options: {
	ctor: IPluginConstructor<any, any, any>
	contribution?: IContribution
	options?: Record<string, any>
}): IPluginDefinition {
	const ns: symbol = options.ctor.namespace
	const nsString: string = ns.description || String(ns).replace(/^Symbol\((.*)\)$/, '$1')

	return {
		ctor: options.ctor,
		contribution: options.contribution,
		options: options.options,
		namespace: nsString,
	}
}
