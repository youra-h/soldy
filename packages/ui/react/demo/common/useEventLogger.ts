import { useEffect, useRef } from 'react'
import type { EventLogEntry } from './EventLog'

/**
 * Конвертирует raw-имя события в React-колбэк-проп:
 * 'change:visible' → 'onChangeVisible', 'element:ready' → 'onElementReady'.
 */
export function toReactHandler(eventName: string): string {
	return (
		'on' +
		eventName
			.split(/[-:]/)
			.filter(Boolean)
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join('')
	)
}

/**
 * Строит объект колбэков onXxx для React-компонента, логирующих каждое событие.
 */
export function buildEventHandlers(
	onLog: (entry: EventLogEntry) => void,
	eventNames: readonly string[],
): Record<string, any> {
	const handlers: Record<string, any> = {}

	for (const eventName of eventNames) {
		handlers[toReactHandler(eventName)] = (payload?: unknown) => {
			onLog({
				timestamp: new Date().toISOString(),
				source: 'react',
				name: eventName,
				payload,
			})
		}
	}

	return handlers
}

/**
 * Подписывается на ВСЕ события core-инстанса через TEvented.use() (middleware).
 * Логирует raw-имя события и payload.
 */
export function useCoreEventLogger(instance: any, onLog: (entry: EventLogEntry) => void): void {
	const onLogRef = useRef(onLog)
	onLogRef.current = onLog

	useEffect(() => {
		if (!instance?.events?.use) return

		const off = instance.events.use((ctx: any) => {
			const payload = ctx.args.length === 1 ? ctx.args[0] : ctx.args

			onLogRef.current({
				timestamp: new Date().toISOString(),
				source: 'core',
				name: String(ctx.event),
				payload,
			})
		})

		return off
	}, [instance])
}
