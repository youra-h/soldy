import { describe, it, expect } from 'vitest'
import postcss from 'postcss'

import { buildCss } from './build-css'

/**
 * Колонка целиком в перестановке колонок Table (`reorderPreview: 'column'`,
 * `src/components/table/_table.scss`): тело идёт за заголовками по номеру
 * колонки — правилом на каждый номер, `:nth-child(k of .s-table-row__cell)`.
 *
 * Такое правило умножается на каждую ячейку тела, а браузер сверяет селектор
 * справа налево: с ячейки, и до корня доходит последним. Признак, который
 * лежал на корне всегда (`data-reorder-preview='head'`), правила не гасил, и
 * каждая ячейка на каждом пересчёте стилей проверялась на тридцать
 * `:nth-child(k of …)` — «выделить все» на 5000 строк по 20 колонок шло на
 * 58 % дольше. Теперь признак есть у корня только в жесте, а по имени
 * атрибута предка браузер отсеивает правило до сверки с ячейкой (фильтр
 * предков; значения он не видит). Поэтому:
 *
 * - правило ячейки на номер колонки — только под признаком корня, и цепочка
 *   предков у него ровно «корень с признаком > тело > строка»: фильтр помнит
 *   из селектора лишь несколько ближайших имён, и в длинной цепочке признак
 *   выпал бы из них;
 * - переход сдвига ячеек — тоже под признаком;
 * - условие по шапке на номер колонки (`:has()` с `:nth-child(`) — у самой
 *   шапки, а не у корня: у корня обход на глубину три шёл бы по всем строкам и
 *   ячейкам тела.
 *
 * Читается собранный CSS: вложенность раскрыта, `@apply` развёрнут, кавычки и
 * пробелы вокруг `>` сборка снимает.
 */

/** Ячейка по номеру колонки — субъект правил тела. */
const CELL_NTH = '.s-table-row__cell:nth-child('

/** Корень с признаком жеста, тело и строка — вся цепочка предков ячейки. */
const CELL_CHAIN = '.s-table[data-reorder-preview=column]>.s-table__body>.s-table-row>'

/** Признак корня в собранном CSS. */
const FLAG = '[data-reorder-preview=column]'

/** Комбинатор селектора: потомок, ребёнок, соседи. */
const COMBINATOR = /[\s>~+]/

/** Глубина скобок перед каждым знаком селектора. */
function depthsOf(selector: string): number[] {
	const depths: number[] = []
	let depth = 0

	for (const char of selector) {
		depths.push(depth)

		if (char === '(') depth++
		else if (char === ')') depth--
	}

	return depths
}

/**
 * Компаунд верхнего уровня, в котором стоит позиция: от комбинатора до
 * комбинатора вне скобок. `:has()` внутри `:not(…)` так относится к тому же
 * компаунду, что и `:not`.
 */
function compoundAt(selector: string, at: number): string {
	const depths = depthsOf(selector)
	let start = 0
	let end = selector.length

	for (let index = at - 1; index >= 0; index--) {
		if (depths[index] === 0 && COMBINATOR.test(selector[index])) {
			start = index + 1
			break
		}
	}

	for (let index = at; index < selector.length; index++) {
		if (depths[index] === 0 && COMBINATOR.test(selector[index])) {
			end = index
			break
		}
	}

	return selector.slice(start, end)
}

/** Аргумент функции, чья открывающая скобка — в позиции `open`. */
function argumentAt(selector: string, open: number): string {
	let depth = 0

	for (let index = open; index < selector.length; index++) {
		if (selector[index] === '(') depth++
		else if (selector[index] === ')' && --depth === 0) return selector.slice(open + 1, index)
	}

	throw new Error(`скобка не закрыта: ${selector}`)
}

/** Каждое `:has(…)` селектора — его аргумент и компаунд, к которому оно привязано. */
function hasesOf(selector: string): { argument: string; anchor: string }[] {
	const found: { argument: string; anchor: string }[] = []

	for (let at = selector.indexOf(':has('); at !== -1; at = selector.indexOf(':has(', at + 1)) {
		found.push({
			argument: argumentAt(selector, at + ':has'.length),
			anchor: compoundAt(selector, at),
		})
	}

	return found
}

/** Субъект селектора — его последний компаунд. */
const subjectOf = (selector: string): string => compoundAt(selector, selector.length - 1)

/** Компаунд — корень таблицы или её шапка, а не другой блок с тем же началом имени. */
const isRoot = (compound: string) => /^\.s-table(?![\w-])/.test(compound)
const isHead = (compound: string) => /^\.s-table__head(?![\w-])/.test(compound)

type TDecl = { prop: string; value: string }

describe('перестановка колонок Table: правила тела — только под признаком жеста', async () => {
	const css = postcss.parse(await buildCss())

	/** Селекторы правил Table — каждый со своими объявлениями. */
	const rules: { selector: string; decls: TDecl[] }[] = []

	css.walkRules((rule) => {
		const decls = rule.nodes.flatMap((node) =>
			node.type === 'decl' ? [{ prop: node.prop, value: node.value }] : [],
		)

		for (const selector of rule.selectors) {
			if (selector.includes('.s-table')) rules.push({ selector, decls })
		}
	})

	it('правила ячеек на номер колонки есть — по одному на номер', () => {
		const numbered = rules.filter(({ selector }) => selector.includes(CELL_NTH))

		expect(numbered.length).toBeGreaterThanOrEqual(30)
	})

	it('правило ячейки на номер колонки — под признаком корня, через тело и строку', () => {
		const misses = rules
			.filter(({ selector }) => selector.includes(CELL_NTH))
			.filter(({ selector }) => !selector.includes(CELL_CHAIN + CELL_NTH))
			.map(({ selector }) => selector)

		expect(misses).toEqual([])
	})

	it('переход сдвига ячеек тела — под признаком корня', () => {
		const transitions = rules.filter(
			({ selector, decls }) =>
				subjectOf(selector).startsWith('.s-table-row__cell') &&
				decls.some(
					({ prop, value }) =>
						prop.startsWith('transition') && value.includes('translate'),
				),
		)
		const misses = transitions
			.filter(({ selector }) => !selector.includes(CELL_CHAIN))
			.map(({ selector }) => selector)

		expect(transitions.length).toBeGreaterThan(0)
		expect(misses).toEqual([])
	})

	it(':has() с :nth-child( — только у шапки', () => {
		const anchored = rules.flatMap(({ selector }) =>
			hasesOf(selector)
				.filter(({ argument }) => argument.includes(':nth-child('))
				.map(({ anchor }) => ({ selector, anchor })),
		)
		const misses = anchored
			.filter(({ anchor }) => !isHead(anchor))
			.map(({ selector }) => selector)

		expect(anchored.length).toBeGreaterThan(0)
		expect(misses).toEqual([])
	})

	it('в правилах под признаком у корня таблицы нет :has()', () => {
		const misses = rules
			.filter(({ selector }) => selector.includes(FLAG))
			.filter(({ selector }) => hasesOf(selector).some(({ anchor }) => isRoot(anchor)))
			.map(({ selector }) => selector)

		expect(misses).toEqual([])
	})
})
