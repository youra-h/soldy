import { TCalendarLocale } from './locale.class'
import type { ICalendarLocale } from './types'

/**
 * Локали по тегу, как их задали. Карта заводится при первом обращении, а не
 * при загрузке модуля: приложению без календаря она не нужна.
 */
let locales: Map<string, ICalendarLocale> | undefined

/**
 * Локаль календаря по тегу — одна на тег: её форматтеры создаются один раз и
 * служат всем календарям с этим тегом. Невалидный и пустой тег — `en-US`.
 */
export function calendarLocale(tag: string | undefined): ICalendarLocale {
	const key = tag ?? ''

	locales ??= new Map()

	let locale = locales.get(key)

	if (locale === undefined) {
		locale = new TCalendarLocale(tag)
		locales.set(key, locale)
	}

	return locale
}
