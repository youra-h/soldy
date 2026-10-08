import type { TTranslations } from '@soldy-ui/core'

/** События хранилища языка и словаря приложения. */
export type TLocaleStoreEvents = {
	/** change:locale — приложение сменило язык (`useLocale`) */
	'change:locale': (locale: string) => void
	/** change:translations — приложение сменило словарь (`useTranslations`) */
	'change:translations': (translations: TTranslations) => void
}

/**
 * Что плагину языка нужно от владельца: свойство `locale`.
 *
 * Структурный тип, а не класс: плагин стоит на календаре, поле даты,
 * DatePicker и таблице, а общего у них только это свойство.
 */
export interface ILocaleOwner {
	locale: string
}
