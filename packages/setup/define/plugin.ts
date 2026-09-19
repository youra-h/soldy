/**
 * definePlugin — создаёт определение плагина и записывает его контракт за классом.
 *
 * props/events нормализуются в TName с namespace из options.namespace. Пропы
 * получают умолчание — значение, с которым плагин стартует (`withPluginDefault`).
 *
 * Типы contribution — аргументы после неймспейса: карта событий, входы и выходы
 * (`IPluginDefinition`). Нет входов, а выходы есть — на месте входов `object`.
 *
 * Контракт плагина — свойство его класса, а не места, где его поставили.
 * Плагин дескриптора объявляет пропсы и события через дескриптор. Плагин,
 * поставленный снаружи (`usePlugins` при сборке или `bundle.use` в любой
 * момент жизни компонента), своих пропсов в поверхности компонента не имеет:
 * их значения приходят в `pluginProps`, а события уходят конвертом
 * `plugin:event`. Какие у него пропсы и события, контекст узнаёт здесь —
 * `pluginContractOf(ctor)`. Определение, созданное позже, заменяет прежнее.
 */

import type { IContribution } from '@soldy/accessor'
import type { IPluginConstructor } from '@soldy/plugins'
import type { IPluginDefinition } from './types'
import { normalizeContribution } from './contribution'
import { withPluginDefault } from './defaults'

const contracts = new WeakMap<IPluginConstructor<any, any, any>, IPluginDefinition>()

export function definePlugin<
	N extends string | undefined = undefined,
	TEvents extends object = object,
	TProps extends object = object,
	TOutputs extends object = object,
>(options: {
	ctor: IPluginConstructor<any, any, any>
	namespace?: N
	contribution?: IContribution
	options?: object
}): IPluginDefinition<N, TEvents, TProps, TOutputs> {
	const { props, events } = normalizeContribution(options.contribution, options.namespace)

	const definition: IPluginDefinition<N, TEvents, TProps, TOutputs> = {
		ctor: options.ctor,
		props: props.map((prop) => withPluginDefault(prop, options.ctor, options.options)),
		events,
		options: options.options,
		namespace: options.namespace,
	}

	contracts.set(options.ctor, definition)

	return definition
}

/** Контракт плагина — последнее его определение `definePlugin`; нет — пропсов и событий у плагина нет. */
export function pluginContractOf(
	ctor: IPluginConstructor<any, any, any>,
): IPluginDefinition | undefined {
	return contracts.get(ctor)
}
