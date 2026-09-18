/**
 * Набор плагинов компонента: плагины дескриптора, затем реестра, объявление на микрозадаче.
 *
 * Эмит `bundle:create` живёт там же, где плагины создаются, а не отдельным
 * шагом, который каждый адаптер обязан помнить и вызывать: седьмой адаптер про
 * него забудет (AGENTS.md, «Почему bundle не принимается снаружи»).
 */

import type { IEventEmitter } from '@soldy/core'
import { TPluginBundle } from '@soldy/plugins'
import type { IPluginBundle } from '@soldy/plugins'
import { resolveRegisteredPlugins } from '../registry'
import type { IBundleContext, IComponentDescriptor } from '../define/types'
import { rememberRegisteredPlugins } from './registered'

/** Шина событий инстанса — если она у него есть. */
function hasEmit(value: unknown): value is Pick<IEventEmitter, 'emit'> {
	return (
		typeof value === 'object' &&
		value !== null &&
		'emit' in value &&
		typeof value.emit === 'function'
	)
}

/**
 * Объявить набор наружу. `bundle:create` идёт на шину инстанса: это
 * единственный канал, видимый и шаблону, и тому, у кого на руках только ctrl.
 * Свойством (`btn.plugins`) выразить нельзя — до монтирования bundle не
 * существует.
 *
 * Отложено на микрозадачу по той же причине, что и `engine:create` в
 * engine.class.ts: адаптер подписывается на события уже после того, как
 * получил bundle, и синхронный эмит ушёл бы в пустоту.
 *
 * Сначала bundle, потом плагины: иначе обработчик `bundle:create` не успел бы
 * подписаться на плагинный `create`. Объявляет плагины сам набор, а не цикл по
 * дескриптору: плагин, поставленный в обработчике `bundle:create`, объявляется
 * вместе с остальными.
 */
function announceOnMicrotask(bundle: IPluginBundle, instance: object): void {
	Promise.resolve().then(() => {
		const events: unknown = Reflect.get(instance, 'events')

		if (hasEmit(events)) events.emit('bundle:create', bundle)

		bundle.created()
	})
}

/**
 * Собирает набор: плагины дескриптора, затем плагины реестра (`usePlugins`),
 * подходящие компоненту по типу и `context.embedded`.
 */
export function assembleBundle(
	descriptor: Pick<IComponentDescriptor, 'ctor' | 'plugins'>,
	instance: object,
	context: IBundleContext,
): IPluginBundle | null {
	// Без своих плагинов у компонента нет и узла для них (`TElementPlugin`):
	// плагины реестра такому компоненту не ставятся
	if (descriptor.plugins.length === 0) {
		return null
	}

	const bundle = new TPluginBundle(instance)

	for (const plugin of descriptor.plugins) {
		bundle.use(plugin.ctor, plugin.options ?? {})
	}

	// Плагины реестра — после своих: они зависят от плагинов компонента,
	// а не наоборот. Заменить свой плагин внешний не может: набор
	// компонента — его инвариант (AGENTS.md, «Почему bundle не
	// принимается снаружи»).
	const registered = resolveRegisteredPlugins(instance, context)

	for (const plugin of registered) {
		if (bundle.get(plugin.ctor)) {
			throw new Error(
				`${plugin.ctor.name} уже входит в состав ${descriptor.ctor.name}: плагин реестра только добавляет`,
			)
		}

		bundle.use(plugin.ctor, plugin.options ?? {})
	}

	rememberRegisteredPlugins(bundle, instance, registered)

	announceOnMicrotask(bundle, instance)

	return bundle
}
