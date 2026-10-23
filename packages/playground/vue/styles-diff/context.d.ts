/**
 * Что прогону сравнения стилей отдаёт `styles-diff/cli.ts` (`provide` Vitest),
 * и команда, которой он печатает отчёт (`vitest.styles.config.ts`), — здесь
 * только их типы.
 */

import 'vitest'
import 'vitest/browser'

declare module 'vitest' {
	export interface ProvidedContext {
		/** Лист темы «до» — текст CSS. */
		stylesBefore: string
		/** Лист темы «после» — текст CSS. */
		stylesAfter: string
		/** Фреймворки стенда, чьи страницы сравниваются: `vue`, `webc`… */
		stylesFrameworks: string[]
		/** Файл отчёта; пусто — только в консоль. */
		stylesOut: string
	}
}

declare module 'vitest/browser' {
	interface BrowserCommands {
		/** Напечатать кусок отчёта и дописать его в файл `out`, если он задан */
		stylesReport: (text: string, out: string) => Promise<void>
	}
}
