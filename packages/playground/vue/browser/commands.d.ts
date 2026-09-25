/**
 * Команды браузерного прогона — объявлены в `vitest.browser.config.ts`
 * (`test.browser.commands`), здесь только их типы.
 */

import 'vitest/browser'

declare module 'vitest/browser' {
	interface BrowserCommands {
		/** Нажать основную кнопку мыши там, где мышь стоит */
		mouseDown: () => Promise<void>
		/** Отпустить основную кнопку мыши */
		mouseUp: () => Promise<void>
	}
}
