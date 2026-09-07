/**
 * Заглушки браузерных API, которых нет в jsdom.
 *
 * `ResizeObserver` использует TTabsLayoutPlugin, чтобы следить за размерами
 * табов. Без заглушки монтирование Tabs валит необработанную ошибку — тесты
 * при этом проходят, но шум маскирует настоящие сбои.
 */

if (!('ResizeObserver' in globalThis)) {
	class ResizeObserverStub {
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {}
	}

	;(globalThis as any).ResizeObserver = ResizeObserverStub
}
