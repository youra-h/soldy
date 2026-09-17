import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'

/**
 * Сторож правила «значения оформления объявляет тема» (AGENTS.md,
 * «Оформление: значения объявляет тема»): разметка компонентов библиотеки не
 * передаёт вложенному компоненту значение темы.
 *
 * Раньше крестик таба рисовался `view="plain"`, строка таба — `view="none"`.
 * Это имена oren: у темы с другими именами такая разметка ставила бы
 * модификатор, под который CSS нет, а тема без видов не смогла бы от него
 * отказаться. Часть без `view` тема красит по контексту.
 *
 * Сканируется исходный текст `packages/ui/*\/src/components/**` без
 * комментариев. Типы ловят то же не везде: шаблоны Angular `tsc` не
 * проверяет, а у пакетов без фикстуры темы тип значения — `never`, и ошибка
 * говорила бы о типе, а не о правиле. Ловится запись литерала, а не смысл:
 * значение, вычисленное в адаптере, остаётся на ревью.
 */

const ROOT = resolve(__dirname, '../../..')
const UI = join(ROOT, 'packages/ui')

const PROPS = '(?:view|variant|shape|animation)'

/** Формы записи литерала в разметке шести адаптеров. */
const LITERALS: readonly { readonly form: string; readonly pattern: RegExp }[] = [
	// Vue, Svelte, JSX, Angular, HTML: `view="plain"`. Не `:view`, не `[view]`,
	// не `data-view` и не `this.view = …`
	{
		form: 'атрибут',
		pattern: new RegExp(`(?<![\\w:.\\[@-])${PROPS}\\s*=\\s*["'][^"']*["']`, 'g'),
	},
	// Vue: `:view="'plain'"`, `v-bind:view="'plain'"`
	{
		form: 'привязка Vue',
		pattern: new RegExp(`:${PROPS}\\s*=\\s*"\\s*['\`][^'\`]*['\`]\\s*"`, 'g'),
	},
	// JSX, Svelte: `view={'plain'}`
	{
		form: 'выражение JSX',
		pattern: new RegExp(`${PROPS}\\s*=\\s*\\{\\s*(['"\`])[^'"\`]*\\1\\s*\\}`, 'g'),
	},
	// Angular: `[view]="'plain'"`
	{
		form: 'привязка Angular',
		pattern: new RegExp(`\\[${PROPS}\\]\\s*=\\s*"\\s*'[^']*'\\s*"`, 'g'),
	},
	// Функции рендера: `h(Button, { view: 'plain' })`
	{ form: 'объект пропсов', pattern: new RegExp(`\\b${PROPS}\\s*:\\s*['"\`]`, 'g') },
]

const EXTENSIONS = /\.(vue|svelte|tsx?|html)$/

function stripComments(source: string): string {
	return source
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function findLiterals(source: string): string[] {
	const code = stripComments(source)

	return LITERALS.flatMap(({ form, pattern }) =>
		[...code.matchAll(pattern)].map(([match]) => `${form}: ${match}`),
	)
}

function collectFiles(dir: string, files: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const full = join(dir, name)

		if (statSync(full).isDirectory()) {
			collectFiles(full, files)
		} else if (EXTENSIONS.test(name)) {
			files.push(full)
		}
	}

	return files
}

function componentDirs(): string[] {
	return readdirSync(UI)
		.map((adapter) => join(UI, adapter, 'src/components'))
		.filter((dir) => {
			try {
				return statSync(dir).isDirectory()
			} catch {
				return false
			}
		})
}

describe('разметка компонентов не передаёт значений темы', () => {
	/** Без этой проверки сторож мог бы молча не сработать ни на что. */
	it.each([
		'<Button view="plain" />',
		`<Button :view="'plain'" />`,
		`<Button v-bind:variant="'accent'" />`,
		`<Button view={'plain'} />`,
		`<soldy-button [shape]="'rounded'"></soldy-button>`,
		`h(Button, { animation: 'pulse' })`,
	])('ловит литерал: %s', (sample) => {
		expect(findLiterals(sample)).not.toEqual([])
	})

	it.each([
		'<Button :view="view" :variant="variant" />',
		'<Button view={view} />',
		'<soldy-button [view]="view"></soldy-button>',
		'<div data-view="x" />',
		'this.view = value',
		'<!-- view="plain" в комментарии -->\n// view: \'plain\'',
	])('не ловит привязку и комментарий: %s', (sample) => {
		expect(findLiterals(sample)).toEqual([])
	})

	it('в src/components/** адаптеров нет литерала view, variant, shape или animation', () => {
		const dirs = componentDirs()

		expect(dirs.length, 'не найдено ни одного src/components адаптера').toBeGreaterThan(0)

		const violations = dirs
			.flatMap((dir) => collectFiles(dir))
			.flatMap((file) =>
				findLiterals(readFileSync(file, 'utf-8')).map(
					(found) => `${relative(ROOT, file).split('\\').join('/')}: ${found}`,
				),
			)

		expect(
			violations,
			`Значение темы в разметке библиотеки (см. AGENTS.md, «Оформление: значения` +
				` объявляет тема»):\n${violations.join('\n')}`,
		).toEqual([])
	})
})
