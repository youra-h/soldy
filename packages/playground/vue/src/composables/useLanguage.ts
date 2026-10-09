import { computed, ref, watchEffect } from 'vue'
import type { TLocale } from '@soldy-ui/plugins'
import { LOCALES } from '@soldy-ui/playground-shared'

const STORAGE_KEY = 'soldy-playground-locale'

/** Язык ли это из списка стенда — у значения из хранилища и из списка в шапке. */
function isLanguage(value: unknown): value is string {
	return typeof value === 'string' && Object.hasOwn(LOCALES, value)
}

/**
 * Язык при первом открытии стенда: язык браузера, если он есть в списке, — по
 * тегу целиком или по языку (`ru` → `ru-RU`), — иначе английский.
 */
function browserLanguage(): string {
	const tag = globalThis.navigator?.language ?? ''
	const language = tag.split('-')[0]
	const tags = Object.keys(LOCALES)

	return (
		tags.find((value) => value === tag) ??
		tags.find((value) => value.split('-')[0] === language) ??
		'en-US'
	)
}

const language = ref(browserLanguage())

try {
	const saved = localStorage.getItem(STORAGE_KEY)

	if (isLanguage(saved)) language.value = saved
} catch {
	// Приватный режим или заблокированное хранилище — не повод падать
}

/**
 * Локаль выбранного языка — та, что уходит провайдеру оболочки и хостам превью
 * (загрузчик хостов, `hosts/index.ts`).
 */
export const locale = computed<TLocale>(() => (LOCALES[language.value] ?? LOCALES['en-US']).locale)

/**
 * Язык библиотеки на стенде: строки, подписи дат, первый день недели, формат
 * поля даты и сортировка таблицы на любом языке из списка.
 *
 * Язык стенд держит сам, а библиотеке отдаёт локалью провайдера: своего языка
 * у компонента нет, и пропом его на превью не задать. Провайдер оболочки
 * (`LocaleProvider` в `App.vue`) переводит её собственные компоненты, а превью
 * рисуют хосты фреймворков в своих корнях — им локаль отдаёт загрузчик
 * (`setLocale`), и у каждого корня свой провайдер. Смену провайдер пишет
 * компонентам на лету, без перемонтирования.
 *
 * Язык общий на всё приложение (модульный `ref`), как тема (`useTheme`), и
 * переживает перезагрузку стенда (хранилище браузера).
 */
export function useLanguage() {
	watchEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, language.value)
		} catch {
			// см. выше
		}
	})

	/** Выбрать язык: значение из списка в шапке, другое ничего не меняет. */
	function choose(value: unknown): void {
		if (isLanguage(value)) language.value = value
	}

	return { language, locale, languages: LOCALES, choose }
}
