import { setIcons } from '@soldy/setup'
import * as material from '@soldy/icons-material'

/**
 * То же, что в `ui/vue/__tests__/setup.ts`: заглушка браузерного API, которого
 * в jsdom нет, и пакет иконок.
 *
 * `ResizeObserver` держат `TAnchorPlugin`, `TListHeightPlugin` и
 * `TTabsLayoutPlugin` — все трое меряют элементы. Без заглушки каждая
 * отрисовка табов, списка или панели с якорем даёт необработанную ошибку:
 * тесты при этом проходят, но за сотнями строк шума настоящий сбой не виден.
 */

if (!('ResizeObserver' in globalThis)) {
	class ResizeObserverStub {
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {}
	}

	globalThis.ResizeObserver = ResizeObserverStub
}

/** Пакет иконок подключает приложение — в тестах эту роль играет setup. */
setIcons(material)
