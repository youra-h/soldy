/**
 * Окружение тестов Web Components (`setupFiles` в `vitest.config.ts`).
 */

/**
 * Заглушка `ResizeObserver`: jsdom его не реализует, а Frame следит им за
 * размером панели и якоря (`TAnchorPlugin`). Без заглушки узел, объявленный
 * `element:ready`, валит необработанную ошибку. Та же заглушка — в настройке
 * тестов Vue, React, Svelte, Solid и Angular.
 */

if (!('ResizeObserver' in globalThis)) {
	class ResizeObserverStub {
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {}
	}

	globalThis.ResizeObserver = ResizeObserverStub
}
