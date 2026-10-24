import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import type { TTheme } from './themes'

/**
 * Имена переменных, которые код пишет строкой, — для сторожей переменных
 * (`variable-prefix.spec.ts`, `theme-reads.spec.ts`, контракт в
 * `base-css.spec.ts`).
 *
 * Код пишет переменную строкой — константой имени или аргументом
 * `setProperty`. Модификатор класса пишется так же, но его место — аргумент
 * метода `TClasses` (`classes.add('--ready-animation')`), так же его различает
 * сторож библиотеки (`packages/setup/__tests__/css-variable-prefix.spec.ts`).
 */

/** Место строки: файл кода от корня, который читает сторож. */
export type TVariable = { readonly place: string; readonly name: string }

/** Строка, которая начинается с `--` и буквы: переменная или модификатор класса. */
const QUOTED = /['"`](--[a-zA-Z][\w-]*)/g

/**
 * Место модификатора класса — сразу перед строкой: первый аргумент метода
 * `TClasses` или значение ключа его `swap` и `swapClass`.
 */
const CLASS_MODIFIER_PLACE =
	/(?:\b_?classes\.(?:add|remove|toggle|has|get|resolve)\(|\b(?:prefix|oldClass|newClass)\s*:)\s*$/

/** Файлы кода — `.ts`, рекурсивно, без тестов. */
function codeFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry)

		if (statSync(path).isDirectory()) return entry === '__tests__' ? [] : codeFiles(path)

		return path.endsWith('.ts') ? [path] : []
	})
}

/** Код без комментариев; `//` после `:` — адрес в строке, а не комментарий. */
export function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** Имена, которые код каталога пишет строкой, — без модификаторов классов. */
export function writtenVariables(dir: string, label: string): TVariable[] {
	if (!existsSync(dir)) return []

	return codeFiles(dir).flatMap((file) => {
		const code = stripComments(readFileSync(file, 'utf8'))
		const place = `${label}/${relative(dir, file).split('\\').join('/')}`

		return [...code.matchAll(QUOTED)]
			.filter((match) => !CLASS_MODIFIER_PLACE.test(code.slice(0, match.index)))
			.map((match) => ({ place, name: match[1] }))
	})
}

/** Имена, которые пишет поведение темы — `setup/` её пакета, если есть. */
export const behaviourVariables = ({ dir }: TTheme): TVariable[] =>
	writtenVariables(join(dir, 'setup'), 'setup')
