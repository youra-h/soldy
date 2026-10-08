import { afterEach } from 'vitest'
import { DEFAULT_LOCALE } from '@soldy-ui/core'
import { useLocale, useTranslations } from '@soldy-ui/plugins'
import { setIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import oren from '@soldy-ui/theme-oren/setup'

/**
 * То же, что в `ui/vue/__tests__/setup.ts`: заглушка браузерного API, которого
 * в jsdom нет, и пакет иконок. Сверх того — поведение темы oren, как в
 * `src/main.ts` стенда.
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

/** Поведение темы подключает приложение (`src/main.ts`) — здесь тоже setup. */
useTheme(oren)

/**
 * Язык и словарь библиотеки задаёт приложение — у стенда это выбор языка в
 * шапке (`useLanguage`). Тест, который задал их сам (`useLocale`,
 * `useTranslations`), следующему их не оставляет: после каждого — снова
 * английские. Хук общий и для браузерного прогона, и объявлен раньше его хуков:
 * размонтирование спека идёт до него.
 */
afterEach(() => {
	useLocale(DEFAULT_LOCALE)
	useTranslations()
})
