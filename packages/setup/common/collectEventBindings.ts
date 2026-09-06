/**
 * collectEventBindings — плоский дедуплицированный список подписок для проброса
 * событий ядра наружу (emit во Vue, колбэк-проп в React, EventEmitter в Angular).
 *
 * Зачем дедупликация: один и тот же raw-триггер объявлен у нескольких пропов.
 * Например, `present` — производное от `rendered && visible`, поэтому в
 * ComponentContribution у него triggers: ['change:rendered', 'change:visible'],
 * то есть те же события, что у самих `rendered` и `visible`. Без дедупликации
 * на `change:rendered` вешаются две подписки и потребитель получает два эмита
 * на одно изменение.
 *
 * ВАЖНО: дедуплицировать можно только проброс событий. Синхронизацию состояния
 * (bindOutput) дедуплицировать нельзя — `present` обязан пересчитываться на
 * обоих триггерах.
 */

import type { IAccessor, TDescriptorInspector } from '@soldy/accessor'

export interface IEventBinding {
	/** Источник событий: instance.events компонента или плагина. */
	source: any
	/** Имя события для подписки на источник. */
	rawName: string
	/** Имя события для проброса наружу (по naming-стратегии фреймворка). */
	exportName: string
}

export function collectEventBindings(
	accessor: IAccessor,
	inspector: TDescriptorInspector,
): IEventBinding[] {
	const bindings: IEventBinding[] = []
	const seen = new Map<any, Set<string>>()

	function add(source: any, rawName: string, exportName: string): void {
		let names = seen.get(source)

		if (!names) {
			names = new Set()
			seen.set(source, names)
		}

		if (names.has(rawName)) return

		names.add(rawName)
		bindings.push({ source, rawName, exportName })
	}

	// 1. Триггеры свойств (включая protected — они тоже сигнализируют наружу)
	for (const prop of accessor.getProps(true)) {
		const source = accessor.getEventSource(prop)

		if (!source) continue

		const rawTriggers = inspector.getRawTriggers(prop)
		const exportTriggers = inspector.getExportTriggers(prop)

		for (let i = 0; i < rawTriggers.length; i++) {
			add(source, rawTriggers[i], exportTriggers[i])
		}
	}

	// 2. Явные события
	for (const event of accessor.getEvents()) {
		const source = accessor.getEventSource(event)

		if (!source) continue

		add(source, event.name.name, inspector.getExportEventName(event.name))
	}

	return bindings
}
