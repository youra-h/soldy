import { DEFAULT_LOCALE, DEFAULT_TRANSLATIONS, TEvented } from '@soldy-ui/core'
import type { TTranslations } from '@soldy-ui/core'
import type { TLocaleStoreEvents } from './types'

/**
 * Язык и словарь приложения — одни на всю библиотеку.
 *
 * Задаёт их приложение (`useLocale`, `useTranslations`), а читают только
 * плагины языка и словаря: при установке пишут компоненту текущее значение и
 * подписываются на смену. Ядро на хранилище не подписано: у инстанса нет
 * жизненного цикла, и глобальная шина держала бы его в памяти вечно. Подписка
 * плагина живёт, пока жив его набор.
 *
 * Хранилище одно на процесс. Серверу, который параллельно рисует страницы на
 * разных языках, нужен провайдер по поддереву — его у библиотеки нет: язык
 * задаётся до отрисовки, одной страницей за раз.
 */
class TLocaleStore {
	readonly events = new TEvented<TLocaleStoreEvents>()

	private _locale: string = DEFAULT_LOCALE
	private _translations: TTranslations = DEFAULT_TRANSLATIONS

	/** Язык — тег BCP 47, как задан; тег, которого нет у движка, Intl читает как `en-US`. */
	get locale(): string {
		return this._locale
	}

	/** Тот же тег — ничего не меняет. */
	set locale(value: string) {
		if (this._locale === value) return

		this._locale = value
		this.events.emit('change:locale', value)
	}

	/** Словарь строк библиотеки — английский или с наложенными строками приложения. */
	get translations(): TTranslations {
		return this._translations
	}

	/** Тот же словарь — ничего не меняет. */
	set translations(value: TTranslations) {
		if (this._translations === value) return

		this._translations = value
		this.events.emit('change:translations', value)
	}
}

export const localeStore = new TLocaleStore()
