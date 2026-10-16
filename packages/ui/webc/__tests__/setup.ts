/**
 * Окружение тестов Web Components (`setupFiles` в `vitest.config.ts`).
 */

import { setIcons } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'

/**
 * Пакет иконок подключает приложение — как тему. Тесты играют роль
 * приложения: без пакета отметка CheckBox и иконка кнопки очистки Input
 * рисуют заглушку и предупреждают в консоль о роли, которой нет. Так же —
 * в настройке тестов React и Angular.
 */

setIcons(material)

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
