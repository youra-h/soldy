import { DEFAULT_TRANSLATIONS } from '@soldy-ui/core'
import type { TPartialTranslations, TTranslations } from '@soldy-ui/core'
import { localeStore } from './store'

/**
 * Задать язык библиотеки — на всё приложение, как режим движения
 * (`useMotion`): зовут в точке входа, на сервере тоже.
 *
 * ```ts
 * useLocale('ru-RU') // подписи дат, первый день недели, формат поля даты, сортировка таблицы
 * ```
 *
 * Язык — тег BCP 47 для Intl, и только: строки библиотеки задаёт словарь
 * (`useTranslations`), это отдельный вызов. Компоненты с языком (календарь,
 * поле даты, DatePicker, таблица) получают его от плагина языка при
 * монтировании, а смену — на лету, без перемонтирования. Своего языка у
 * компонента нет. Тот же тег — ничего не меняет; тег, которого нет у движка,
 * Intl читает как `en-US`.
 */
export function useLocale(tag: string): void {
	localeStore.locale = tag
}

/**
 * Задать строки библиотеки — на всё приложение: имена кнопок без текста
 * (закрыть, листать, очистить) и полей, которым подпись неоткуда взять.
 *
 * ```ts
 * useTranslations(ru)              // свой словарь поверх английского
 * useTranslations(ru, { tags: { more: 'Ещё теги' } }) // и точечно поверх него
 * useTranslations()                // снова английский
 * ```
 *
 * Части накладываются по порядку на английское умолчание
 * (`DEFAULT_TRANSLATIONS`), а не на результат прошлого вызова: словарь — это
 * то, что передано сейчас, и от истории вызовов не зависит. Чего в частях
 * нет, остаётся английским; ключ со значением `undefined` — тоже. Строка с
 * именем части — функция от имени (`tabs.close`, `tags.close`, `field.clear`):
 * порядок слов у каждого языка свой.
 *
 * Компоненты получают словарь от плагина словаря при монтировании, а смену —
 * на лету.
 */
export function useTranslations(...parts: readonly TPartialTranslations[]): void {
	localeStore.translations = parts.length > 0 ? overlay(parts) : DEFAULT_TRANSLATIONS
}

/**
 * Словарь из частей поверх английского. Разделы перечислены поимённо: новый
 * раздел словаря без строки здесь — ошибка компиляции, а не молча английский.
 */
function overlay(parts: readonly TPartialTranslations[]): TTranslations {
	const translations: TTranslations = {
		modal: section('modal', parts),
		dialog: section('dialog', parts),
		popover: section('popover', parts),
		tabs: section('tabs', parts),
		tags: section('tags', parts),
		scroller: section('scroller', parts),
		field: section('field', parts),
		table: section('table', parts),
		calendar: section('calendar', parts),
		datePicker: section('datePicker', parts),
	}

	// Словарь один на всю библиотеку, как и английский: правка на месте молча
	// переименовала бы кнопки у всех компонентов, не сообщив ни одному
	Object.freeze(translations)

	return translations
}

/** Раздел `key`: английский, поверх — тот же раздел каждой части по порядку. */
function section<K extends keyof TTranslations>(
	key: K,
	parts: readonly TPartialTranslations[],
): TTranslations[K] {
	const result = parts.reduce<TTranslations[K]>(
		(merged, part) => ({ ...merged, ...defined(part[key]) }),
		DEFAULT_TRANSLATIONS[key],
	)

	Object.freeze(result)

	return result
}

/** Строки части без ключей со значением `undefined`: такой ключ строку не задаёт. */
function defined<T extends object>(part: Partial<T> | undefined): Partial<T> {
	const result: Partial<T> = {}

	if (part === undefined) return result

	for (const key in part) {
		const value = part[key]

		if (value !== undefined) result[key] = value
	}

	return result
}
