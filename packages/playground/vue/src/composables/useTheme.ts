import { ref, watchEffect } from 'vue'
import { THEMES } from '@soldy/playground-shared'

const STORAGE_KEY = 'soldy-playground-theme'

const theme = ref(THEMES[0].value)
const dark = ref(false)

try {
	const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')

	if (saved) {
		theme.value = saved.theme ?? theme.value
		dark.value = Boolean(saved.dark)
	}
} catch {
	// Приватный режим или заблокированное хранилище — не повод падать
}

/**
 * Тема и цветовая схема.
 *
 * Схема — не отдельная тема, а суффикс: `oren` и `oren-dark` — два значения
 * одного атрибута `data-theme`, светлые токены объявлены на `:root`, тёмные
 * перекрывают их ниже по файлу. Поэтому переключатель один, а не два списка.
 *
 * Состояние общее на всё приложение (модульный `ref`, а не `provide`): тему
 * читает и шапка, и любая страница, а второго экземпляра стенда не бывает.
 */
export function useTheme() {
	watchEffect(() => {
		document.documentElement.dataset.theme = dark.value ? `${theme.value}-dark` : theme.value

		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({ theme: theme.value, dark: dark.value }),
			)
		} catch {
			// см. выше
		}
	})

	return { theme, dark, themes: THEMES }
}
