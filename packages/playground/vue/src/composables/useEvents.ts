import type { TComponentEntry } from '@soldy-ui/playground-shared'
import { useEmits } from '@soldy-ui/vue'

export type TEventSource = 'props' | 'instance'

/** Куда отдать событие: имя, как его эмитит компонент, и аргументы. */
export type TEventSink = (name: string, args: unknown[]) => void

/**
 * Обработчики всех событий компонента.
 *
 * Список — ровно тот, что компонент объявляет Vue в `emits`: `useEmits` его
 * дескриптора и, у коллекций, дескриптора фасада — так же склеивают его
 * `base.component.ts` коллекционных компонентов. Туда входят явные события,
 * триггеры пропов и `update:<prop>` для v-model. Добавили событие — оно
 * появится на стенде само.
 *
 * Куда отдавать, решает вызывающий: страница свойств печатает в консоль с
 * пометкой колонки (обе колонки рисуют один компонент и эмитят одинаковые
 * имена), сценарий пишет в журнал своего прогона.
 */
export function useEvents(entry: TComponentEntry) {
	const names = [
		...new Set([
			...useEmits(entry.descriptor()),
			...(entry.collectionDescriptor ? useEmits(entry.collectionDescriptor()) : []),
		]),
	]

	return function handlers(sink: TEventSink): Record<string, (...args: unknown[]) => void> {
		const map: Record<string, (...args: unknown[]) => void> = {}

		for (const name of names) {
			// Во Vue имя события остаётся как есть (`change:visible`), а слушатель
			// в разметке — это проп `onChange:visible`
			map[`on${name[0].toUpperCase()}${name.slice(1)}`] = (...args: unknown[]) =>
				sink(name, args)
		}

		return map
	}
}
