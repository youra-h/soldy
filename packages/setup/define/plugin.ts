/**
 * definePlugin — объявляет плагин: его контракт, один раз на класс.
 *
 *   export const DismissPluginDescriptor = definePlugin({
 *     ctor: TDismissPlugin,
 *     namespace: 'dismiss',
 *     contribution: { … },
 *   })
 *
 *   plugins: [AriaPluginDescriptor, DismissPluginDescriptor.with({ focusOutside: true })]
 *
 * props/events нормализуются в TName с namespace. Опций у объявления нет: они —
 * свойство места, где плагин поставили, и задаёт их `with()` (`TPluginDefinition`).
 *
 * Типы руками не пишутся: `definePlugin` выводит контракт плагина из его класса
 * и contribution (`TPluginContractFrom`). Входы — незащищённые пропсы, выходы —
 * защищённые, тип значения — у одноимённого свойства класса или у `get`;
 * события — карта класса, суженная до `events` и триггеров пропсов; опции —
 * второй параметр `install()`.
 *
 * Контракт плагина — свойство его класса, а не места, где его поставили.
 * Плагин дескриптора объявляет пропсы и события через дескриптор. Плагин,
 * поставленный снаружи (`usePlugins` при сборке или `bundle.use` в любой
 * момент жизни компонента), своих пропсов в поверхности компонента не имеет:
 * их значения приходят в `pluginProps`, а события уходят конвертом
 * `plugin:event`. Какие у него пропсы и события, сборка узнаёт здесь —
 * `pluginContractOf(ctor)`. Записывает контракт только `definePlugin`:
 * `with()` его не трогает, опции одного дескриптора чужому не видны.
 */

import type { IContribution } from '@soldy/accessor'
import type { TPluginContractFrom } from './inference.types'
import type { IPluginDefinition, TPluginCtor } from './types'
import { normalizeContribution } from './contribution'
import { TPluginDefinition } from './plugin-definition.class'

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
}): IPluginDefinition<TPluginContractFrom<InstanceType<TCtor>, N, TContribution>> {
	const { props, events } = normalizeContribution(options.contribution, options.namespace)

	const definition = new TPluginDefinition<
		TPluginContractFrom<InstanceType<TCtor>, N, TContribution>
	>(options.ctor, options.namespace, props, events)

	contracts.set(options.ctor, definition)

	return definition
}

/** Контракт плагина — его объявление `definePlugin`; нет — пропсов и событий у плагина нет. */
export function pluginContractOf(ctor: TPluginCtor): IPluginDefinition | undefined {
	return contracts.get(ctor)
}
