/**
 * Файл примера — куда «Открыть в VS Code» пишет код колонок.
 *
 * Расширение — синтаксиса хоста: код Vue — однофайловый компонент, код React —
 * компонент с JSX. Список один на контракт хоста (`IPreviewSnippets`) и
 * эндпоинт стенда, который пишет файл: хост объявляет расширение из него, а
 * эндпоинт других не пишет — имя файла приходит из браузера.
 *
 * Модуль без импортов: эндпоинт — часть конфига Vite, и его сборщик вкладывает
 * модуль в конфиг сам (см. `vite-open-in-editor.ts`).
 */
export const SNIPPET_EXTENSIONS = ['vue', 'tsx'] as const

export type TSnippetExtension = (typeof SNIPPET_EXTENSIONS)[number]

export function isSnippetExtension(value: unknown): value is TSnippetExtension {
	return SNIPPET_EXTENSIONS.some((extension) => extension === value)
}
