/**
 * Окружение спеков Angular (`setupFiles` цели `test` в `angular.json`): его
 * билдер выполняет перед файлами спеков, после TestBed.
 */

import { setIcons } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'

/**
 * Пакет иконок подключает приложение — как тему. Спеки играют роль
 * приложения: без пакета иконка по роли рисует заглушку и предупреждает в
 * консоль о роли, которой нет. Тот же вызов — в настройке тестов React,
 * Svelte и Solid.
 */

setIcons(material)

/**
 * Заглушка `ResizeObserver`: jsdom его не реализует, а Frame следит им за
 * размером панели и якоря (`TAnchorPlugin`). Без заглушки узел, объявленный
 * `element:ready`, валит необработанную ошибку. Та же заглушка — в настройке
 * тестов Vue, React, Svelte и Solid.
 */

if (!('ResizeObserver' in globalThis)) {
	class ResizeObserverStub {
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {}
	}

	globalThis.ResizeObserver = ResizeObserverStub
}
