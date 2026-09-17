import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative, sep } from 'node:path'

/**
 * Сторож признака `embedded`: компонент soldy, который разметка библиотеки
 * использует как деталь другого компонента (строка и крестик тега, поле и
 * список Select), несёт имя места.
 *
 * По признаку `usePlugins` со `scope: 'own'` отличает кнопку пользователя от
 * крестика тега. Забытый признак ничего не роняет — плагин приложения молча
 * встанет в чужую разметку, поэтому и нужен сторож.
 *
 * Признак не нужен элементам своей коллекции: `ListBoxItem`, нарисованный
 * `ListBox`, — это элемент списка, а не деталь. Их узнаёт префикс: имя тега
 * начинается с имени компонента, в папке которого лежит разметка.
 *
 * Компонентом soldy считается тег с именем папки компонента (`Button`,
 * `soldy-button`) или с её префиксом (`TagsItem`). Сканируется
 * `packages/ui/*\/src/components/**` без комментариев.
 */

const ROOT = resolve(__dirname, '../../..')
const UI = join(ROOT, 'packages/ui')

const EXTENSIONS = /\.(vue|svelte|tsx|html)$/

const pascal = (kebab: string) =>
	kebab
		.split('-')
		.map((word) => word[0].toUpperCase() + word.slice(1))
		.join('')

function adapters(): { adapter: string; dir: string }[] {
	return readdirSync(UI)
		.map((adapter) => ({ adapter, dir: join(UI, adapter, 'src/components') }))
		.filter(({ dir }) => {
			try {
				return statSync(dir).isDirectory()
			} catch {
				return false
			}
		})
}

/** Имена компонентов soldy — папки компонентов всех адаптеров. */
function componentNames(): string[] {
	const names = new Set<string>()

	for (const { dir } of adapters()) {
		for (const name of readdirSync(dir)) {
			if (statSync(join(dir, name)).isDirectory()) names.add(pascal(name))
		}
	}

	return [...names]
}

function collectFiles(dir: string, files: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const full = join(dir, name)

		if (statSync(full).isDirectory()) collectFiles(full, files)
		else if (EXTENSIONS.test(name)) files.push(full)
	}

	return files
}

function stripComments(source: string): string {
	return source
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** Открывающий тег целиком — до `>` вне кавычек и фигурных скобок. */
function readTag(source: string, start: number): string {
	let quote: string | null = null
	let depth = 0

	for (let i = start; i < source.length; i++) {
		const char = source[i]

		if (quote) {
			if (char === quote) quote = null
		} else if (char === '"' || char === "'" || char === '`') {
			quote = char
		} else if (char === '{') {
			depth++
		} else if (char === '}') {
			depth--
		} else if (char === '>' && depth === 0 && source[i - 1] !== '=') {
			return source.slice(start, i + 1)
		}
	}

	return source.slice(start)
}

/** Вложенные компоненты soldy без признака: `тег` для отчёта. */
function findUnmarked(source: string, owner: string, names: readonly string[]): string[] {
	const code = stripComments(source)
	const found: string[] = []

	for (const match of code.matchAll(/<(soldy-[a-z-]+|[A-Z][A-Za-z]*)(?=[\s/>])/g)) {
		const raw = match[1]
		const tag = raw.startsWith('soldy-') ? pascal(raw.slice('soldy-'.length)) : raw

		if (!names.some((name) => tag === name || tag.startsWith(name))) continue
		if (tag.startsWith(owner)) continue

		const opening = readTag(code, match.index)

		if (!/[\s[:]embedded\]?\s*=/.test(opening)) found.push(raw)
	}

	return found
}

describe('вложенные компоненты разметки несут признак embedded', () => {
	const names = componentNames()

	it.each([
		['<Button :size="size" />', 'Tags', ['Button']],
		['<Button\n\t@click="() => a > b"\n>', 'Tags', ['Button']],
		['<soldy-icon [size]="size"></soldy-icon>', 'Tags', ['soldy-icon']],
		['<Button embedded="tags.close" />', 'Tags', []],
		['<Icon embedded={name} />', 'Tags', []],
		['<soldy-icon [embedded]="name"></soldy-icon>', 'Tags', []],
		['<TagsItem :ctrl="item" />', 'Tags', []],
		['<!-- <Button /> -->', 'Tags', []],
	])('%s в %s', (source, owner, expected) => {
		expect(findUnmarked(source, owner, ['Button', 'Icon', 'Tags'])).toEqual(expected)
	})

	it('в src/components/** адаптеров вложенный компонент без признака не встречается', () => {
		const dirs = adapters()

		expect(dirs.length, 'не найдено ни одного src/components адаптера').toBeGreaterThan(0)
		expect(names).toContain('Button')

		const violations = dirs.flatMap(({ dir }) =>
			collectFiles(dir).flatMap((file) => {
				const owner = pascal(relative(dir, file).split(sep)[0])

				return findUnmarked(readFileSync(file, 'utf-8'), owner, names).map(
					(tag) => `${relative(ROOT, file).split(sep).join('/')}: <${tag}>`,
				)
			}),
		)

		expect(
			violations,
			`Вложенный компонент без embedded (см. AGENTS.md, «Плагины и расширения снаружи»):\n${violations.join('\n')}`,
		).toEqual([])
	})
})
