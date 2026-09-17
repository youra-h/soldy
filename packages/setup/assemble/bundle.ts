/**
 * Набор плагинов компонента: по составу, с объявлением наружу на микрозадаче.
 *
 * Эмит `bundle:create` живёт там же, где плагины создаются, а не отдельным
 * шагом, который каждый адаптер обязан помнить и вызывать: седьмой адаптер про
 * него забудет (AGENTS.md, «Почему bundle не принимается снаружи»).
 */

import type { IEventEmitter } from '@soldy/core'
import { TPluginBundle } from '@soldy/plugins'
import type { IPluginBundle } from '@soldy/plugins'
import type { ICompositionEntry } from './types'

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
 * составу: плагин, поставленный в обработчике `bundle:create`, объявляется
 * вместе с остальными.
 */
function announceOnMicrotask(bundle: IPluginBundle, instance: object): void {
	Promise.resolve().then(() => {
		const events: unknown = Reflect.get(instance, 'events')

		if (hasEmit(events)) events.emit('bundle:create', bundle)

		bundle.created()
	})
}

/** Собирает набор по составу; пустой состав — набора у компонента нет. */
export function assembleBundle(
	composition: readonly ICompositionEntry[],
	instance: object,
): IPluginBundle | null {
	if (composition.length === 0) return null

	const bundle = new TPluginBundle(instance)

	for (const entry of composition) {
		bundle.use(entry.ctor, entry.options ?? {})
	}

	announceOnMicrotask(bundle, instance)

	return bundle
}
