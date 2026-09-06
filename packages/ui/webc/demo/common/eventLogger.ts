import type { EventLogEntry } from './EventLog'

/**
 * Подписывает элемент на все события компонента.
 *
 * Имена CustomEvent совпадают с именами в ядре, поэтому преобразование не
 * нужно — в отличие от React/Svelte/Solid, где события становятся `onXxx`.
 *
 * Возвращает функцию отписки.
 */
export function bindEventLogger(
	host: HTMLElement,
	eventNames: readonly string[],
	onLog: (entry: EventLogEntry) => void,
): () => void {
	const offs: Array<() => void> = []

	for (const name of eventNames) {
		const handler = (event: Event) => {
			onLog({
				timestamp: new Date().toISOString(),
				source: 'webc',
				name,
				payload: (event as CustomEvent).detail,
			})
		}

		host.addEventListener(name, handler)
		offs.push(() => host.removeEventListener(name, handler))
	}

	return () => offs.forEach((off) => off())
}

/**
 * Подписывается на ВСЕ события core-инстанса через TEvented.use() (middleware).
 * Возвращает функцию отписки.
 */
export function bindCoreEventLogger(
	instance: any,
	onLog: (entry: EventLogEntry) => void,
): () => void {
	if (!instance?.events?.use) return () => {}

	return instance.events.use((ctx: any) => {
		const payload = ctx.args.length === 1 ? ctx.args[0] : ctx.args

		onLog({
			timestamp: new Date().toISOString(),
			source: 'core',
			name: String(ctx.event),
			payload,
		})
	})
}

/** Синхронизирует значения props с core-инстансом. */
export function syncPropsToInstance(instance: any, props: Record<string, any>): void {
	for (const key of Object.keys(props)) {
		const value = props[key]

		if (value === undefined) continue
		if (instance[key] === value) continue

		instance[key] = value
	}
}
