/**
 * definePlugin — создаёт определение плагина.
 * props/events нормализуются в TName с namespace из options.namespace.
 */

import type { IContribution } from '@soldy/accessor'
import type { IPluginConstructor } from '@soldy/plugins'
import type { IPluginDefinition } from './types'
import { normalizeContribution } from './compile-contribution'

export function definePlugin<
	N extends string | undefined = undefined,
	TEvents extends object = {},
>(options: {
	ctor: IPluginConstructor<any, any, any>
	namespace?: N
	/**
	 * Пропы плагина — часть публичного API компонента, без префикса.
	 *
	 * Для плагинов, которые не добавляют поведение сбоку, а **дают компоненту
	 * свойства**: `maxRows`, а не `layout_maxRows`. События префикс сохраняют.
	 *
	 * Всё-или-ничего на плагин, а не список имён: список пришлось бы держать
	 * в согласии с contribution, и опечатка молча вернула бы префикс. Нужны и
	 * плоские, и префиксные пропы — значит плагинов должно быть два.
	 */
	flatProps?: boolean
	contribution?: IContribution
	options?: Record<string, any>
}): IPluginDefinition<N, TEvents> {
	const { props, events } = normalizeContribution(options.contribution, options.namespace, {
		flatProps: options.flatProps,
	})

	return {
		ctor: options.ctor,
		props,
		events,
		options: options.options,
		namespace: options.namespace,
	}
}
