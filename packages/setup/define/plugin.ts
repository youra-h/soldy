/**
 * definePlugin — создаёт определение плагина и записывает его контракт за классом.
 *
 * props/events нормализуются в TName с namespace из options.namespace. Пропы
 * получают умолчание — значение, с которым плагин стартует (`withPluginDefault`).
 *
 * Типы руками не пишутся: `definePlugin` выводит контракт плагина из его класса
 * и contribution (`TPluginContractFrom`). Входы — незащищённые пропсы, выходы —
 * защищённые, тип значения — у одноимённого свойства класса или у `get`;
 * события — карта класса, суженная до `events` и триггеров пропсов.
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
import type { TPluginContractFrom } from './inference.types'
import type { IPluginDefinition, TPluginCtor } from './types'
import { normalizeContribution } from './contribution'
import { withPluginDefault } from './defaults'

const contracts = new WeakMap<TPluginCtor, IPluginDefinition>()

/**
 * Параметры типа выводятся из опций, явно их не передают. Неймспейс и
 * contribution — `const`: из их литералов складываются имена в контракте.
 */
export function definePlugin<
	TCtor extends TPluginCtor,
	const N extends string | undefined = undefined,
	const TContribution extends IContribution = IContribution,
>(options: {
	ctor: TCtor
	namespace?: N
	contribution?: TContribution
	options?: object
}): IPluginDefinition<TPluginContractFrom<InstanceType<TCtor>, N, TContribution>> {
	const { props, events } = normalizeContribution(options.contribution, options.namespace)

	const definition: IPluginDefinition<
		TPluginContractFrom<InstanceType<TCtor>, N, TContribution>
	> = {
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
export function pluginContractOf(ctor: TPluginCtor): IPluginDefinition | undefined {
	return contracts.get(ctor)
}
