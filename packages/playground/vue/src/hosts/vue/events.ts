import type { TComponentEntry, TPreviewEventSink } from '@soldy-ui/playground-shared'
import { useEmits } from '@soldy-ui/vue'

/**
 * Слушатели всех событий компонента — во Vue.
 *
 * Список — ровно тот, что компонент объявляет Vue в `emits`: `useEmits` его
 * дескриптора и, у коллекций, дескриптора фасада — так же склеивают его
 * `base.component.ts` коллекционных компонентов. Туда входят явные события,
 * триггеры пропов и `update:<prop>` для v-model. Добавили событие — оно
 * появится на стенде само.
 *
 * Имя события во Vue и есть полное имя ядра (`change:visible`), и приёмник
 * получает его как есть. `update:<prop>` — v-model Vue: в приёмник он тоже
 * идёт, но у других фреймворков его нет. Куда отдавать, решает оболочка:
 * страница свойств печатает в консоль с пометкой колонки, сценарий пишет в
 * журнал своего прогона.
 */
export function listenersOf(
	entry: TComponentEntry,
	sink: TPreviewEventSink,
): Record<string, (...args: unknown[]) => void> {
	const names = new Set([
		...useEmits(entry.descriptor()),
		...(entry.collectionDescriptor ? useEmits(entry.collectionDescriptor()) : []),
	])
	const listeners: Record<string, (...args: unknown[]) => void> = {}

	for (const name of names) {
		// Слушатель в разметке Vue — проп `onChange:visible`
		listeners[`on${name[0].toUpperCase()}${name.slice(1)}`] = (...args: unknown[]) =>
			sink(name, args)
	}

	return listeners
}
