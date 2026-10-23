import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'

/**
 * Сторож правила «Префикс — только в глобальном пространстве имён» (корневой
 * `AGENTS.md`) для переменных CSS: переменная, которую пишет библиотека —
 * ядро, плагин, setup или адаптер, — а читает тема, начинается с `--so-`.
 *
 * Переменные наследуются по DOM, и одноимённая переменная приложения у предка
 * подменяет запасное значение темы: ширина, которую приложение объявило для
 * своих окон, становилась шириной окна soldy, которому `width` не задали.
 * Префикс поэтому у всей категории, а не у имён, которые уже столкнулись, — как
 * у классов (`packages/core/__tests__/class-prefix.spec.ts`).
 *
 * Сканируется код без комментариев — в объяснениях имена законны в любом виде.
 * Имя переменной — строка, которая начинается с `--` и буквы: ключ объекта
 * стилей (`{ '--so-filler-height': … }`), константа имени для `setProperty`,
 * имя в таблице плагина, — и привязка стиля в шаблоне Svelte (`style:--x`) и
 * Angular (`[style.--x]`). Модификатор класса (`'--view-'`, `'--readonly'`)
 * пишется так же, но переменной не является: его отличает место — аргумент
 * метода `TClasses` (`classes.toggle('--open', …)`) или значение `prefix`,
 * `oldClass` и `newClass` у `swap` и `swapClass`. Имя, собранное из частей
 * (`` `--${name}` ``), сторож не видит: имя переменной пишется целиком.
 *
 * Свои переменные тема называет сама (`packages/themes/oren/AGENTS.md`), и те,
 * что пишет её поведение (`setup/` пакета темы), — тоже её: их читает она же.
 * Поведение тем сторож не сканирует: у тем схема та же, `--so-*`, и стережёт
 * её сторож каждой темы в общем слое тем
 * (`packages/themes/base/__tests__/variable-prefix.spec.ts`).
 */

const ROOT = resolve(__dirname, '../../..')
const PACKAGES = join(ROOT, 'packages')

const EXCLUDED_DIR_NAMES = new Set(['node_modules', 'dist', '__tests__', '.svelte-kit'])

const SOURCE_FILE = /\.(ts|tsx|js|vue|svelte|html)$/

/** Корни сканирования: код библиотеки — ядро, плагины, оба слоя setup, адаптеры. */
function roots(): string[] {
	const inside = (dir: string) =>
		readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory())

	return [
		join(PACKAGES, 'core/src'),
		join(PACKAGES, 'plugins/src'),
		join(PACKAGES, 'setup/protected'),
		join(PACKAGES, 'setup/content'),
		...inside(join(PACKAGES, 'ui')).map((name) => join(PACKAGES, 'ui', name, 'src')),
	]
}

function collect(dir: string, files: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		if (EXCLUDED_DIR_NAMES.has(name)) continue

		const full = join(dir, name)

		if (statSync(full).isDirectory()) collect(full, files)
		else if (SOURCE_FILE.test(name)) files.push(full)
	}

	return files
}

/** Код без комментариев: `/* *​/`, `//` и `<!-- -->` разметки компонентов. */
function stripComments(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** Строка, которая начинается с `--` и буквы: переменная или модификатор класса. */
const QUOTED = /['"`](--[a-zA-Z][\w-]*)/g

/** Привязка переменной в шаблоне: `style:--x` у Svelte, `[style.--x]` у Angular. */
const STYLE_BINDING = /\bstyle[:.](--[a-zA-Z][\w-]*)/g

/**
 * Место модификатора класса — сразу перед строкой: первый аргумент метода
 * `TClasses` или значение ключа его `swap` и `swapClass`.
 */
const CLASS_MODIFIER_PLACE =
	/(?:\b_?classes\.(?:add|remove|toggle|has|get|resolve)\(|\b(?:prefix|oldClass|newClass)\s*:)\s*$/

type TVariable = { readonly path: string; readonly name: string }

/** Имена переменных в коде файла — без модификаторов классов. */
function variablesOf(path: string, code: string): TVariable[] {
	const quoted = [...code.matchAll(QUOTED)]
		.filter((match) => !CLASS_MODIFIER_PLACE.test(code.slice(0, match.index)))
		.map((match) => match[1])
	const bound = [...code.matchAll(STYLE_BINDING)].map((match) => match[1])

	return [...quoted, ...bound].map((name) => ({ path, name }))
}

const sources = roots()
	.flatMap((dir) => collect(dir))
	.map((file) => ({
		path: relative(ROOT, file).split('\\').join('/'),
		code: stripComments(readFileSync(file, 'utf8')),
	}))

const variables = sources.flatMap(({ path, code }) => variablesOf(path, code))

describe('префикс переменных CSS библиотеки', () => {
	it('сканер видит код пакетов и переменные в каждом виде записи', () => {
		// Пустой список прошёл бы проверку ниже на любом коде
		expect(sources.length).toBeGreaterThan(100)

		const names = new Set(variables.map(({ name }) => name))

		// Ключ объекта стилей в ядре, имя в таблице плагина и константа имени
		// для `setProperty`: регулярка, которая их не видит, или место
		// модификатора, которое их глотает, стерегли бы пустоту
		expect(names).toContain('--so-table-column-width')
		expect(names).toContain('--so-dialog-offset-top')
		expect(names).toContain('--so-swipe-offset')
	})

	it('имя каждой переменной начинается с --so-', () => {
		const violations = variables
			.filter(({ name }) => !name.startsWith('--so-'))
			.map(({ path, name }) => `${path}: ${name}`)

		expect(
			violations,
			'Переменная CSS, которую пишет библиотека, начинается с --so- (AGENTS.md, ' +
				'«Префикс — только в глобальном пространстве имён»); модификатор класса ' +
				'передаётся методу TClasses',
		).toEqual([])
	})
})
