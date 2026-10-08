import { ref, watchEffect } from 'vue'
import { useLocale } from '@soldy-ui/plugins'
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
 * Язык библиотеки на стенде: подписи дат, первый день недели, формат поля
 * даты и сортировка таблицы на любом языке из списка.
 *
 * Язык стенд держит сам и на каждую смену отдаёт библиотеке (`useLocale`), как
 * режим движения (`useMotionMode`): своего языка у компонента нет, и пропом
 * его на превью не задать. Компоненты получают смену на лету, без
 * перемонтирования. Строк библиотеки стенд не переводит: словарь
 * (`useTranslations`) — отдельный вызов, а готовых переводов у библиотеки нет.
 *
 * Язык общий на всё приложение (модульный `ref`), как тема (`useTheme`).
 */
export function useLanguage() {
	watchEffect(() => {
		useLocale(language.value)

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

	return { language, languages: LOCALES, choose }
}
