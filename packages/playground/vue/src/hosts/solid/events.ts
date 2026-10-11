import { TSurface } from '@soldy-ui/setup'
import { SolidProfile } from '@soldy-ui/solid'
import type { TComponentEntry, TPreviewEventSink } from '@soldy-ui/playground-shared'

/**
 * Слушатели всех событий компонента — в Solid.
 *
 * Список — поверхность компонента в профиле Solid (`TSurface`): свои события
 * и триггеры пропов, у коллекций — ещё и фасада. По ней же компонент отдаёт
 * события колбэк-пропами, поэтому слушатель есть ровно у того, что компонент
 * объявил. Добавили событие — оно появится на стенде само.
 *
 * Имя колбэка — имя Solid (`onChangeText`), а приёмник получает полное имя
 * ядра (`change:text`): журнал сценария и консоль страницы одни на все
 * фреймворки. `update:<prop>` — v-model Vue, в Solid его нет.
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
		for (const { name, exportName } of TSurface.of(descriptor, SolidProfile).events) {
			listeners[exportName] = (...args: unknown[]) => sink(name.getName(), args)
		}
	}

	return listeners
}
