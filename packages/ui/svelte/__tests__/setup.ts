/**
 * Окружение тестов Svelte — общее для клиентского и серверного прогона
 * (`setupFiles` в `vitest.config.ts`).
 */

import { setIcons } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'

/**
 * Пакет иконок подключает приложение — как тему. Тесты играют роль
 * приложения: без пакета иконка по роли рисует заглушку и предупреждает в
 * консоль о роли, которой нет.
 */

setIcons(material)

/**
 * Заглушка `ResizeObserver`: jsdom его не реализует, а Frame следит им за
 * размером панели и якоря (`TAnchorPlugin`). Без заглушки узел, объявленный
 * `element:ready`, валит необработанную ошибку. Та же заглушка — в настройке
 * тестов Vue и React.
 */

if (!('ResizeObserver' in globalThis)) {
	class ResizeObserverStub {
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {}
	}

	globalThis.ResizeObserver = ResizeObserverStub
}
