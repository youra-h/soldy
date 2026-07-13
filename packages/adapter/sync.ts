/**
 * Единица изменения — свойство или событие.
 * Универсальный интерфейс для Vue emit, React setState, DevTools, логгера.
 */
export type Change =
	| { type: 'property'; name: string; value: any }
	| { type: 'event'; name: string; args: any[] }

type Subscriber = (change: Change) => void

/**
 * Результат синхронизации.
 */
export interface SyncBinding {
	/** Подписаться на изменения. Можно вызывать многократно — все подписчики получат уведомление. */
	subscribe: (fn: Subscriber) => void
	/** Отписаться от всех core-событий и очистить подписчиков. */
	dispose: () => void
}

/**
 * Универсальная функция синхронизации.
 * Подписывается на core-события из контракта и уведомляет всех подписчиков.
 * Ничего не знает о Vue/React/Angular — только поток изменений.
 *
 * @returns {@link SyncBinding}
 */
export function sync(
	contract: ReturnType<typeof import('./contract').createContract>,
	instance: any,
): SyncBinding {
	const subscribers: Subscriber[] = []
	const disposers: (() => void)[] = []

	const emit = (change: Change) => {
		for (const fn of subscribers) fn(change)
	}

	// Собираем имена событий, которые являются триггерами свойств
	const triggerEvents = new Set<string>()
	for (const prop of Object.values(contract.props)) {
		for (const event of prop.triggers) {
			triggerEvents.add(event)
		}
	}

	// Подписка на все core-события из контракта
	for (const event of contract.events) {
		const handler = (...args: any[]) => {
			if (triggerEvents.has(event)) {
				// Событие-триггер: перечитываем свойства, для которых оно указано
				for (const [name, prop] of Object.entries(contract.props)) {
					if (prop.triggers.includes(event)) {
						emit({ type: 'property', name, value: prop.get(instance) })
					}
				}
			} else {
				// Обычное событие (show, hide, created, ...)
				emit({ type: 'event', name: event, args })
			}
		}
		instance.events.on(event, handler)
		disposers.push(() => instance.events.off(event, handler))
	}

	return {
		subscribe(fn: Subscriber) {
			subscribers.push(fn)
		},
		dispose() {
			subscribers.length = 0
			disposers.forEach((d) => d())
		},
	}
}
