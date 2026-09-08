import type { IComponentDescriptor } from '@soldy/setup'
import { createInspector } from '@soldy/ui-vue'

export type TEventSource = 'props' | 'instance'

/**
 * Обработчики всех событий компонента — для вывода в консоль.
 *
 * Список берётся из дескриптора, а не пишется руками: `getExportEvents()` даёт
 * и объявленные события, и триггеры пропов, то есть ровно то, что компонент
 * действительно эмитит наружу. Добавили событие — оно появится на стенде само.
 *
 * Пометка источника обязательна: обе колонки страницы рисуют один компонент и
 * эмитят одинаковые имена, и без неё нельзя понять, чьё событие пришло — того,
 * которым управляют пропом, или того, которым управляют через экземпляр ядра.
 */
export function useEvents(descriptor: IComponentDescriptor) {
	const names = createInspector(descriptor).getExportEvents()

	return function handlers(source: TEventSource): Record<string, (...args: unknown[]) => void> {
		const map: Record<string, (...args: unknown[]) => void> = {}

		for (const name of names) {
			// Во Vue имя события остаётся как есть (`change:visible`), а слушатель
			// в разметке — это проп `onChange:visible`
			map[`on${name[0].toUpperCase()}${name.slice(1)}`] = (...args: unknown[]) =>
				console.log(`[${source}] ${name}`, ...args)
		}

		return map
	}
}
