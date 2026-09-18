import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Поиск классов Tailwind в теме выключен.
 *
 * Сканер Tailwind ищет имена классов во всех текстах пакета вместе с
 * комментариями — в типах, документации, тестах — и выпускает по ним утилиты в
 * `dist`. Так в тему попадали глобальные `.rounded`, `.outline` и `.ring` из
 * `index.d.ts`, `.bg-rose-500` и `.border-s` из `AGENTS.md` и тестов, и такой
 * класс в разметке приложения получал стили темы. Стилям компонентов поиск не
 * нужен: `@apply` разворачивает утилиту на месте.
 *
 * Перечень исключений (`@source not`) дыру не закрывает: следующий текст
 * пакета сканер прочтёт снова — первым стал бы `CHANGELOG.md`, который пишет
 * выпуск. Поэтому поиск выключен целиком, а утилита, нужная в `dist` отдельным
 * классом, объявляется явно — `@source inline(…)`.
 */

const SRC = fileURLToPath(new URL('../src', import.meta.url))

/** Стили темы кодом без комментариев: в объяснениях директивы упоминаются. */
const sources = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
	.filter((file) => /\.s?css$/.test(file))
	.map((file) => ({
		name: file,
		code: readFileSync(join(SRC, file), 'utf8')
			.replace(/\/\*[\s\S]*?\*\//g, '')
			.replace(/\/\/.*$/gm, ''),
	}))

function scan(pattern: RegExp): string[] {
	return sources.flatMap(({ name, code }) =>
		[...code.matchAll(pattern)].map(([match]) => `${name}: ${match}`),
	)
}

describe('поиск классов Tailwind выключен', () => {
	it('импорт Tailwind несёт source(none)', () => {
		const imports = scan(/@import\s+(['"])tailwindcss\1[^;]*;/g)

		expect(imports, 'импорт tailwindcss не найден').not.toEqual([])
		expect(imports.filter((line) => !/\ssource\(\s*none\s*\)/.test(line))).toEqual([])
	})

	it('@source не возвращает поиск по путям', () => {
		expect(scan(/@source\s+(?!not\s|inline\()[^;]*;/g)).toEqual([])
	})
})
