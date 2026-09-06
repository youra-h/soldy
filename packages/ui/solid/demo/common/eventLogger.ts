import type { EventLogEntry } from './EventLog'

/**
 * Конвертирует raw-имя события в Solid-колбэк-проп:
 * 'change:visible' → 'onChangeVisible', 'element:ready' → 'onElementReady'.
 */
export function toSolidHandler(eventName: string): string {
	return (
		'on' +
		eventName
			.split(/[-:]/)
			.filter(Boolean)
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join('')
	)
}

/** Строит объект колбэков onXxx, логирующих каждое событие компонента. */
export function buildEventHandlers(
	onLog: (entry: EventLogEntry) => void,
	eventNames: readonly string[],
): Record<string, any> {
	const handlers: Record<string, any> = {}

	for (const eventName of eventNames) {
		handlers[toSolidHandler(eventName)] = (payload?: unknown) => {
			onLog({
				timestamp: new Date().toISOString(),
				source: 'solid',
				name: eventName,
				payload,
			})
		}
	}

	return handlers
}

/**
 * Подписывается на ВСЕ события core-инстанса через TEvented.use() (middleware).
 * Возвращает функцию отписки — вешать через onCleanup.
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
