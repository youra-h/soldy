import { TSurface } from '@soldy-ui/setup'
import { WebcProfile } from '@soldy-ui/webc'
import type { TComponentEntry, TPreviewEventSink } from '@soldy-ui/playground-shared'

/** Слушатель события элемента: имя события DOM и обработчик. */
export type TElementListener = {
	readonly type: string
	readonly listener: (event: Event) => void
}

/**
 * Слушатели всех событий компонента — в Web Components.
 *
 * Список — поверхность компонента в профиле Web Components (`TSurface`): свои
 * события и триггеры пропов, у коллекций — ещё и фасада. По ней же элемент
 * шлёт события `CustomEvent`, поэтому слушатель есть ровно у того, что
 * компонент объявил. Добавили событие — оно появится на стенде само.
 *
 * Имя события элемента — имя ядра как есть (`change:text`), и приёмник
 * получает его же. Аргументы — то, что получил потребитель элемента: один
 * `detail`. Событие всплывает, и слушатель берёт только события самого
 * элемента — не те, что всплыли к нему от вложенных.
 */
export function listenersOf(
	entry: TComponentEntry,
	sink: TPreviewEventSink,
): readonly TElementListener[] {
	const descriptors = [
		entry.descriptor(),
		...(entry.collectionDescriptor ? [entry.collectionDescriptor()] : []),
	]

	return descriptors.flatMap((descriptor) =>
		TSurface.of(descriptor, WebcProfile).events.map(({ name, exportName }) => ({
			type: exportName,
			listener: (event: Event) => {
				if (event.target !== event.currentTarget) return

				sink(name.getName(), [event instanceof CustomEvent ? event.detail : undefined])
			},
		})),
	)
}
