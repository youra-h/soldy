import type { TLocale, TLocalePatch, TPartialTranslations, TTranslations } from './types'

/** Место для имени части в строке-шаблоне. */
const NAME = '{name}'

/**
 * Строка с именем части: шаблон из локали, на месте `{name}` — имя.
 *
 * ```ts
 * formatName('Закрыть {name}', 'Настройки') // 'Закрыть Настройки'
 * formatName('Закрыть {name}', '')          // 'Закрыть'
 * ```
 *
 * Имя приходит без пробелов по краям. Пустое имя — у части имени нет, и
 * строка остаётся без него: пробел, который стоял при имени, не повисает ни
 * по краям, ни двойным в середине.
 */
export function formatName(template: string, name: string): string {
	return template.split(NAME).join(name.trim()).replace(/ {2,}/g, ' ').trim()
}

/**
 * Локаль поверх готовой: свой тег, свои строки, остальное — от `base`.
 *
 * ```ts
 * const esMX = extendLocale(esES, { tag: 'es-MX' })
 * const mn = extendLocale(enUS, {
 * 	tag: 'mn-MN',
 * 	translations: { modal: { close: 'Хаах' } },
 * })
 * ```
 *
 * Так делают регион готового языка, свою формулировку строки и язык, который
 * переведён не целиком: чего в правке нет, остаётся от `base`; ключ со
 * значением `undefined` строку не задаёт. Результат заморожен, как и готовые
 * локали: объект один на всё поддерево, и правка на месте молча
 * переименовала бы кнопки у всех компонентов, не сообщив ни одному.
 */
export function extendLocale(base: TLocale, patch: TLocalePatch): TLocale {
	return Object.freeze({
		tag: patch.tag ?? base.tag,
		translations: overlay(base.translations, patch.translations ?? {}),
	})
}

/**
 * Готовая локаль пакета — замороженной вместе с разделами, как результат
 * `extendLocale`. Наружу не выходит: свою полную локаль приложение пишет
 * обычным объектом.
 */
export function freezeLocale(locale: TLocale): TLocale {
	return extendLocale(locale, {})
}

/**
 * Строки правки поверх строк `base`. Разделы перечислены поимённо: новый
 * раздел без строки здесь — ошибка компиляции, а не молча строки `base`.
 */
function overlay(base: TTranslations, patch: TPartialTranslations): TTranslations {
	return Object.freeze({
		modal: section(base, patch, 'modal'),
		dialog: section(base, patch, 'dialog'),
		popover: section(base, patch, 'popover'),
		tabs: section(base, patch, 'tabs'),
		tags: section(base, patch, 'tags'),
		scroller: section(base, patch, 'scroller'),
		field: section(base, patch, 'field'),
		table: section(base, patch, 'table'),
		calendar: section(base, patch, 'calendar'),
		datePicker: section(base, patch, 'datePicker'),
	})
}

/** Раздел `key`: строки `base`, поверх — заданные строки того же раздела правки. */
function section<K extends keyof TTranslations>(
	base: TTranslations,
	patch: TPartialTranslations,
	key: K,
): TTranslations[K] {
	const result: TTranslations[K] = { ...base[key], ...defined(patch[key]) }

	Object.freeze(result)

	return result
}

/** Строки раздела без ключей со значением `undefined`: такой ключ строку не задаёт. */
function defined<T extends object>(part: Partial<T> | undefined): Partial<T> {
	const result: Partial<T> = {}

	if (part === undefined) return result

	for (const key in part) {
		const value = part[key]

		if (value !== undefined) result[key] = value
	}

	return result
}
