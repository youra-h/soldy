import { afterEach } from 'vitest'
import { DEFAULT_LOCALE } from '@soldy-ui/core'
import { useLocale, useTranslations } from '@soldy-ui/plugins'
import { setIcons } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'

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

	globalThis.ResizeObserver = ResizeObserverStub
}

/**
 * Пакет иконок подключается приложением — как тема. Тесты играют роль
 * приложения, иначе компоненты рисуют заглушки и сыплют предупреждениями.
 */

setIcons(material)

/**
 * Язык и словарь библиотеки тоже задаёт приложение (`useLocale`,
 * `useTranslations`), и они одни на процесс. Тест, который их задал, следующему
 * их не оставляет: после каждого — снова английские.
 */

afterEach(() => {
	useLocale(DEFAULT_LOCALE)
	useTranslations()
})
