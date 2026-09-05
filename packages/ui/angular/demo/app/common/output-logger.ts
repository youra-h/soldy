import { EventLogService } from './event-log.service'

/**
 * Конвертирует raw-имя события в Angular @Output-имя (camelCase),
 * зеркаля AngularNaming.event из adapter: 'change:visible' → 'changeVisible'.
 */
export function toOutputName(raw: string): string {
	return raw
		.split(/[-:]/)
		.filter(Boolean)
		.map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
		.join('')
}

/**
 * Подписывается на dynamic @Output'ы (созданные через `outputs: [...]` массив)
 * и логирует каждое событие в EventLogService.
 *
 * Возвращает функцию отписки.
 */
export function subscribeOutputs(
	component: any,
	rawEvents: readonly string[],
	logService: EventLogService,
): () => void {
	const offs: Array<() => void> = []

	for (const raw of rawEvents) {
		const emitter = component[toOutputName(raw)]

		if (emitter?.subscribe) {
			const sub = emitter.subscribe((payload: unknown) => {
				logService.log({
					timestamp: new Date().toISOString(),
					source: 'props',
					name: raw,
					payload,
				})
			})

			offs.push(() => sub.unsubscribe())
		}
	}

	return () => offs.forEach((off) => off())
}
