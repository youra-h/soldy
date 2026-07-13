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

	// 1. Core-события (show, hide, created, ...)
	for (const event of contract.events) {
		const handler = (...args: any[]) => {
			emit({ type: 'event', name: event, args })
		}
		instance.events.on(event, handler)
		disposers.push(() => instance.events.off(event, handler))
	}

	// 2. Trigger-события свойств (change:visible → перечитать get)
	for (const [name, prop] of Object.entries(contract.props)) {
		for (const event of prop.triggers) {
			const handler = (...args: any[]) => {
				const value = prop.get(instance)
				emit({ type: 'property', name, value })
			}
			instance.events.on(event, handler)
			disposers.push(() => instance.events.off(event, handler))
		}
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
