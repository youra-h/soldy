import { setIcons } from '@soldy/setup'
import * as material from '@soldy/icons-material'

/**
 * То же, что в `ui/vue/__tests__/setup.ts`: заглушка браузерного API, которого
 * в jsdom нет, и пакет иконок.
 *
 * `ResizeObserver` наблюдают `TTabsLayoutPlugin` и `TListLayoutPlugin` — оба
 * меряют элементы. Без заглушки каждая отрисовка списка или табов даёт
 * необработанную ошибку: тесты при этом проходят, но за сотнями строк шума
 * настоящий сбой не виден.
 */

if (!('ResizeObserver' in globalThis)) {
	class ResizeObserverStub {
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {}
	}

	;(globalThis as any).ResizeObserver = ResizeObserverStub
}

/** Пакет иконок подключает приложение — в тестах эту роль играет setup. */
setIcons(material)
