import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import postcss from 'postcss'
import type { Container, Rule } from 'postcss'

import { behaviourVariables } from './behaviour'
import type { TVariable } from './behaviour'
import { OREN, inspectThemes, reportOf } from './themes'
import type { TTheme } from './themes'

/**
 * Переменные CSS темы названы схемой `--so-`, как у библиотеки (корневой
 * `AGENTS.md`, «Префикс — только в глобальном пространстве имён»): токены,
 * переменные компонентов и те, что пишут поведение темы и плагины раскладки.
 * Правило общее для любой темы, и сторож проходит по каждой теме репозитория.
 *
 * Переменная наследуется по DOM, и одноимённая переменная приложения у предка
 * подменяет ту, которую тема на узле ещё не объявила. Так брала бы чужое
 * геометрия Tabs: плагин раскладки пишет её на список только после замера, а
 * до него — в серверной разметке, в первом кадре, без `useTheme` —
 * список наследует переменную предка. Префикс поэтому у всей категории, а не
 * у имён, которые уже столкнулись: переменная, которую тема объявляет на том
 * же узле, где читает, — тоже `--so-*`.
 *
 * Стили читаются собранным CSS темы (`themes.ts`): Sass и `@apply` там
 * развёрнуты, имя из интерполяции видно целиком, а запись Tailwind
 * `ring-(--x)` — обычным `var(--x)`. Имя берётся у объявления, из значения
 * (чтение `var()`, переход зарегистрированной переменной) и у `@property`;
 * модификатор класса стоит в селекторе и сюда не попадает.
 *
 * Поведение темы (`setup/` её пакета, если есть) пишет переменные строкой —
 * константой имени или аргументом `setProperty`, а модификатор класса
 * сторож отличает по месту (`behaviour.ts`). Так же
 * пишут переменные плагины раскладки общего слоя тем (`setup/` базы), которые
 * ставит тема: геометрию Tabs, высоту закреплённой шапки Table и переднего
 * тоста стопки. Их сторож читает отдельно и тем же способом: в списке тем базы
 * нет, а её плагины встают в поведение любой темы.
 *
 * В собранном CSS есть и имена инструментов: Tailwind объявляет свои
 * переменные, а Lightning CSS — `--lightningcss-*`. Их сторож пропускает
 * списком (`packages/themes/oren/AGENTS.md`, «Открытые вопросы»); новое
 * пространство имён инструмента вносится в список явно.
 */

/** Имена инструментов сборки: переменные Tailwind и Lightning CSS. */
const TOOL_NAMES = /^--(?:tw-|lightningcss-|spacing$|radius-|text-|font-|default-|color-)/

const inScheme = (name: string): boolean => name.startsWith('--so-') || TOOL_NAMES.test(name)

/** Имя переменной в значении: `var(--x)`, `transition-property: --x`. */
const IN_VALUE = /(?<![\w-])--[a-zA-Z][\w-]*/g

const isRule = (node: Container | undefined): node is Rule => node?.type === 'rule'

/** Имена переменных в стилях темы и в её поведении. */
function inspect(source: string, theme: TTheme) {
	const css = postcss.parse(source)
	const styles: TVariable[] = []

	css.walkDecls((decl) => {
		const place = isRule(decl.parent) ? decl.parent.selector : '(не правило)'

		if (decl.prop.startsWith('--')) styles.push({ place, name: decl.prop })

		for (const [name] of decl.value.matchAll(IN_VALUE)) styles.push({ place, name })
	})

	css.walkAtRules('property', (rule) => {
		styles.push({ place: '@property', name: rule.params.trim() })
	})

	return { styles, behaviour: behaviourVariables(theme) }
}

const reports = await inspectThemes(inspect)

/**
 * Поведение общего слоя тем — плагины раскладки, которые ставит тема. Стилей
 * базы здесь нет: их сторож видит в CSS каждой темы.
 */
const baseBehaviour = behaviourVariables({
	name: '@soldy-ui/theme-base',
	dir: resolve(import.meta.dirname, '..'),
})

describe.each(reports)('переменные темы — схемой --so- · $name', ({ report }) => {
	it('имя каждой переменной — --so-* или инструмента сборки', () => {
		const violations = [...report.styles, ...report.behaviour]
			.filter(({ name }) => !inScheme(name))
			.map(({ place, name }) => `${place}: ${name}`)

		expect(
			[...new Set(violations)],
			'Переменная темы начинается с --so- (packages/themes/base/AGENTS.md, «Сторожа»): ' +
				'одноимённая переменная приложения у предка подменила бы её. Имена Tailwind и ' +
				'Lightning CSS — в списке TOOL_NAMES',
		).toEqual([])
	})
})

describe('переменные плагинов раскладки — схемой --so-', () => {
	it('имя каждой переменной, которую пишет поведение общего слоя тем, — --so-*', () => {
		const violations = baseBehaviour
			.filter(({ name }) => !name.startsWith('--so-'))
			.map(({ place, name }) => `${place}: ${name}`)

		expect(
			[...new Set(violations)],
			'Переменная, которую пишет плагин раскладки, начинается с --so- ' +
				'(packages/themes/base/AGENTS.md, «Сторожа»): до первой записи узел наследует ' +
				'переменную предка, и одноимённая переменная приложения подменила бы её',
		).toEqual([])
	})
})

describe('сторож не пуст', () => {
	const { styles, behaviour } = reportOf(reports, OREN)

	it('у oren сторож видит имена в стилях', () => {
		const inStyles = new Set(styles.map(({ name }) => name))

		// Пустой список прошёл бы проверку выше на любом коде: объявление
		// токена, чтение переменной поведения, регистрация и имя Tailwind
		expect(inStyles).toContain('--so-neutral-500')
		expect(inStyles).toContain('--so-tabs-active-pos')
		expect(inStyles).toContain('--so-swipe-offset')
		expect(inStyles).toContain('--spacing')
	})

	it('в поведении общего слоя сторож видит имена, которые пишут плагины раскладки', () => {
		const written = new Set(baseBehaviour.map(({ name }) => name))

		// Константа имени и аргумент `setProperty`: место модификатора, которое
		// их глотает, стерегло бы пустоту
		expect(written).toContain('--so-table-head-height')
		expect(written).toContain('--so-toasts-front-height')
		expect(written).toContain('--so-tabs-active-moving')
		expect(written).toContain('--so-tabs-gap-pos')
	})

	it('модификатор класса — не переменная', () => {
		const names = new Set([...styles, ...behaviour, ...baseBehaviour].map(({ name }) => name))

		// `.so-tabs--ready-animation` в стилях oren, `classes.add('--ready-animation')`
		// в плагине раскладки
		expect(names).not.toContain('--ready-animation')
		// `.so-drawer--placement-bottom` в стилях
		expect(names).not.toContain('--placement-bottom')
	})
})
