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
		/** Коснуться пальцем центра узла `count` раз подряд — селектор CSS в рамке теста */
		tap: (selector: string, count?: number) => Promise<void>
		/** Вставить текст без клавиш, как экранная клавиатура: `beforeinput` и `input` */
		insertText: (text: string) => Promise<void>
		/** Текст незавершённой композиции IME; завершает её `insertText` */
		compose: (text: string) => Promise<void>
	}
}
