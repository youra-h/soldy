import { TSurface } from '@soldy-ui/setup'
import { ReactProfile } from '@soldy-ui/react'
import type { TComponentEntry, TPreviewEventSink } from '@soldy-ui/playground-shared'

/**
 * Слушатели всех событий компонента — в React.
 *
 * Список — поверхность компонента в профиле React (`TSurface`): свои события
 * и триггеры пропов, у коллекций — ещё и фасада. По ней же компонент отдаёт
 * события колбэк-пропами, поэтому слушатель есть ровно у того, что компонент
 * объявил. Добавили событие — оно появится на стенде само.
 *
 * Имя колбэка — имя React (`onChangeText`), а приёмник получает полное имя
 * ядра (`change:text`): журнал сценария и консоль страницы одни на все
 * фреймворки. `update:<prop>` — v-model Vue, в React его нет.
 */
export function listenersOf(
	entry: TComponentEntry,
	sink: TPreviewEventSink,
): Record<string, (...args: unknown[]) => void> {
	const descriptors = [
		entry.descriptor(),
		...(entry.collectionDescriptor ? [entry.collectionDescriptor()] : []),
	]
	const listeners: Record<string, (...args: unknown[]) => void> = {}

	for (const descriptor of descriptors) {
		for (const { name, exportName } of TSurface.of(descriptor, ReactProfile).events) {
			listeners[exportName] = (...args: unknown[]) => sink(name.getName(), args)
		}
	}

	return listeners
}
