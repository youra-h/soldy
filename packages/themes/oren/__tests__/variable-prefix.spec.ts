import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import postcss from 'postcss'
import type { Container, Rule } from 'postcss'

import { buildCss } from './build-css'

/**
 * Переменные CSS темы названы схемой `--so-`, как у библиотеки (корневой
 * `AGENTS.md`, «Префикс — только в глобальном пространстве имён»): токены,
 * переменные компонентов и те, что пишет поведение темы.
 *
 * Переменная наследуется по DOM, и одноимённая переменная приложения у предка
 * подменяет ту, которую тема на узле ещё не объявила. Так брала бы чужое
 * геометрия Tabs: поведение темы пишет её на список только после замера, а до
 * него — в серверной разметке, в первом кадре, без `useTheme` — список
 * наследует переменную предка. Префикс поэтому у всей категории, а не у имён,
 * которые уже столкнулись: переменная, которую тема объявляет на том же узле,
 * где читает, — тоже `--so-*`.
 *
 * Стили читаются собранным CSS, тем же конфигом, что у `build:css`: Sass и
 * `@apply` там развёрнуты, имя из интерполяции видно целиком, а запись
 * Tailwind `ring-(--x)` — обычным `var(--x)`. Имя берётся у объявления, из
 * значения (чтение `var()`, переход зарегистрированной переменной) и у
 * `@property`; модификатор класса стоит в селекторе и сюда не попадает.
 *
 * Поведение темы (`setup/`) пишет переменные строкой — константой имени или
 * аргументом `setProperty`. Модификатор класса пишется так же, но его место —
 * аргумент метода `TClasses` (`classes.add('--ready-animation')`), так же его
 * различает сторож библиотеки (`packages/setup/__tests__/css-variable-prefix.spec.ts`).
 *
 * В собранном CSS есть и имена инструментов: Tailwind объявляет свои
 * переменные, а Lightning CSS — `--lightningcss-*`. Их сторож пропускает
 * списком (`AGENTS.md` пакета, «Открытые вопросы»); новое пространство имён
 * инструмента вносится в список явно.
 */

const ROOT = resolve(import.meta.dirname, '..')
const SETUP = join(ROOT, 'setup')

/** Имена инструментов сборки: переменные Tailwind и Lightning CSS. */
const TOOL_NAMES = /^--(?:tw-|lightningcss-|spacing$|radius-|text-|font-|default-|color-)/

const inScheme = (name: string): boolean => name.startsWith('--so-') || TOOL_NAMES.test(name)

/** Имя переменной в значении: `var(--x)`, `transition-property: --x`. */
const IN_VALUE = /(?<![\w-])--[a-zA-Z][\w-]*/g

/** Строка, которая начинается с `--` и буквы: переменная или модификатор класса. */
const QUOTED = /['"`](--[a-zA-Z][\w-]*)/g

/**
 * Место модификатора класса — сразу перед строкой: первый аргумент метода
 * `TClasses` или значение ключа его `swap` и `swapClass`.
 */
const CLASS_MODIFIER_PLACE =
	/(?:\b_?classes\.(?:add|remove|toggle|has|get|resolve)\(|\b(?:prefix|oldClass|newClass)\s*:)\s*$/

type TVariable = { readonly place: string; readonly name: string }

const isRule = (node: Container | undefined): node is Rule => node?.type === 'rule'

/** Файлы поведения темы — `.ts`, рекурсивно. */
function behaviourFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry)

		if (statSync(path).isDirectory()) return behaviourFiles(path)

		return path.endsWith('.ts') ? [path] : []
	})
}

/** Код без комментариев; `//` после `:` — адрес в строке, а не комментарий. */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** Имена, которые поведение темы пишет строкой, — без модификаторов классов. */
function behaviourVariables(): TVariable[] {
	return behaviourFiles(SETUP).flatMap((file) => {
		const code = stripComments(readFileSync(file, 'utf8'))
		const place = `setup/${relative(SETUP, file).split('\\').join('/')}`

		return [...code.matchAll(QUOTED)]
			.filter((match) => !CLASS_MODIFIER_PLACE.test(code.slice(0, match.index)))
			.map((match) => ({ place, name: match[1] }))
	})
}

describe('переменные темы — схемой --so-', async () => {
	const css = postcss.parse(await buildCss())
	const styles: TVariable[] = []

	css.walkDecls((decl) => {
		const place = isRule(decl.parent) ? decl.parent.selector : '(не правило)'

		if (decl.prop.startsWith('--')) styles.push({ place, name: decl.prop })

		for (const [name] of decl.value.matchAll(IN_VALUE)) styles.push({ place, name })
	})

	css.walkAtRules('property', (rule) => {
		styles.push({ place: '@property', name: rule.params.trim() })
	})

	const behaviour = behaviourVariables()

	it('сторож видит имена в стилях и в поведении темы', () => {
		const inStyles = new Set(styles.map(({ name }) => name))
		const written = new Set(behaviour.map(({ name }) => name))

		// Пустой список прошёл бы проверку ниже на любом коде: объявление
		// токена, чтение переменной поведения, регистрация и имя Tailwind
		expect(inStyles).toContain('--so-neutral-500')
		expect(inStyles).toContain('--so-tabs-active-pos')
		expect(inStyles).toContain('--so-swipe-offset')
		expect(inStyles).toContain('--spacing')
		// Константа имени и аргумент `setProperty`: место модификатора, которое
		// их глотает, стерегло бы пустоту
		expect(written).toContain('--so-table-head-height')
		expect(written).toContain('--so-tabs-active-moving')
		expect(written).toContain('--so-tabs-gap-pos')
	})

	it('модификатор класса — не переменная', () => {
		const names = new Set([...styles, ...behaviour].map(({ name }) => name))

		// `.so-tabs--ready-animation` в стилях, `classes.add('--ready-animation')` в поведении
		expect(names).not.toContain('--ready-animation')
		// `.so-drawer--placement-bottom` в стилях
		expect(names).not.toContain('--placement-bottom')
	})

	it('имя каждой переменной — --so-* или инструмента сборки', () => {
		const violations = [...styles, ...behaviour]
			.filter(({ name }) => !inScheme(name))
			.map(({ place, name }) => `${place}: ${name}`)

		expect(
			[...new Set(violations)],
			'Переменная темы начинается с --so- (AGENTS.md пакета, «Тесты»): одноимённая ' +
				'переменная приложения у предка подменила бы её. Имена Tailwind и Lightning CSS — ' +
				'в списке TOOL_NAMES',
		).toEqual([])
	})
})
