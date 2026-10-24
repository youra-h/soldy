import { describe, it, expect } from 'vitest'
import postcss from 'postcss'

import { OREN, inspectThemes, reportOf } from './themes'

/**
 * Колонка целиком в перестановке колонок Table (`reorderPreview: 'column'`):
 * тело идёт за заголовками по номеру колонки — правилом на каждый номер,
 * `:nth-child(k of .so-table-row__cell)`. Правила на номер — общего слоя тем
 * (`src/components/table.css`), а переменные тела, которые они передают
 * ячейкам, и переход ячеек ставит тема своим движением (у oren —
 * `src/components/table/_table.scss`). Правила здесь — о цене стиля, а не об
 * облике, и сторож проходит по собранному CSS каждой темы репозитория: база
 * входит в него вместе с темой.
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
 * - переход сдвига ячеек — тоже под признаком, а что идёт переходом, ячейка
 *   берёт из переменной тела: её тело получает от шапки, пока в шапке есть
 *   взятый заголовок;
 * - условие по шапке на номер колонки (`:has()` с `:nth-child(`) — у самой
 *   шапки, а не у корня: у корня обход на глубину три шёл бы по всем строкам и
 *   ячейкам тела.
 *
 * То же правило обхода — и на покое, без жеста: условие `:has()` у корня
 * таблицы браузер проверяет обходом всего тела на каждом пересчёте стиля
 * корня, и совпадение в шапке обход не сокращает. Поэтому у корня `:has()`
 * нет вовсе: то, что тема узнала бы условием по заголовкам, ядро отдаёт
 * признаком корня — ширины (`data-sized`), а курсор жеста — признаками,
 * которые есть только в жесте: тянут ручку (`data-resizing`), несут колонку
 * (`data-dragging`).
 *
 * Читается собранный CSS темы (`themes.ts`): вложенность раскрыта, `@apply`
 * развёрнут, кавычки и пробелы вокруг `>` сборка снимает.
 */

/** Ячейка по номеру колонки — субъект правил тела. */
const CELL_NTH = '.so-table-row__cell:nth-child('

/** Корень с признаком жеста, тело и строка — вся цепочка предков ячейки. */
const CELL_CHAIN = '.so-table[data-reorder-preview=column]>.so-table__body>.so-table-row>'

/** Признак корня в собранном CSS. */
const FLAG = '[data-reorder-preview=column]'

/** Переменная тела: что у ячеек идёт переходом, пока в шапке взятый заголовок. */
const BODY_TRANSITION = '--so-table-body-transition'

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

/**
 * Компаунд без аргументов своих `:has()`: то, что в них, — потомки, а не сам
 * компаунд.
 */
function withoutHas(compound: string): string {
	let result = ''

	for (let at = 0; at < compound.length;) {
		if (compound.startsWith(':has(', at)) {
			at += ':has()'.length + argumentAt(compound, at + ':has'.length).length
		} else {
			result += compound[at++]
		}
	}

	return result
}

/**
 * Компаунд — корень таблицы: её класс в нём самом, в том числе в `:where()` и
 * `:is()`, — или её шапка, а не другой блок с тем же началом имени.
 */
const isRoot = (compound: string) => /\.so-table(?![\w-])/.test(withoutHas(compound))
const isHead = (compound: string) => /^\.so-table__head(?![\w-])/.test(compound)

type TDecl = { prop: string; value: string }
type TTableRule = { selector: string; decls: TDecl[] }

/** Селекторы правил Table — каждый со своими объявлениями. */
function tableRulesOf(source: string): TTableRule[] {
	const rules: TTableRule[] = []

	postcss.parse(source).walkRules((rule) => {
		const decls = rule.nodes.flatMap((node) =>
			node.type === 'decl' ? [{ prop: node.prop, value: node.value }] : [],
		)

		for (const selector of rule.selectors) {
			if (selector.includes('.so-table')) rules.push({ selector, decls })
		}
	})

	return rules
}

/**
 * Что сторож нашёл в CSS темы: правила каждой проверки (`seen`, сторож пуст,
 * если их нет) и нарушения среди них (`misses`).
 */
function inspect(source: string) {
	const rules = tableRulesOf(source)

	/** Правила ячейки тела на номер колонки. */
	const numbered = rules.filter(({ selector }) => selector.includes(CELL_NTH))

	/** Правила ячейки тела с переходом. */
	const cellTransitions = rules.filter(
		({ selector, decls }) =>
			subjectOf(selector).startsWith('.so-table-row__cell') &&
			decls.some(({ prop }) => prop.startsWith('transition')),
	)

	/** Список переходов ячейки — каждое объявление со своим правилом. */
	const lists = cellTransitions.flatMap(({ selector, decls }) =>
		decls
			.filter(({ prop }) => prop === 'transition' || prop === 'transition-property')
			.map(({ value }) => ({ selector, value })),
	)
	const fromBody = new RegExp(`^var\\(${BODY_TRANSITION}\\s*,\\s*none\\)$`)

	/** Правила, которые ставят переменную тела. */
	const setters = rules.filter(({ decls }) => decls.some(({ prop }) => prop === BODY_TRANSITION))

	/** `:has()` с `:nth-child(` — и компаунд, к которому оно привязано. */
	const anchored = rules.flatMap(({ selector }) =>
		hasesOf(selector)
			.filter(({ argument }) => argument.includes(':nth-child('))
			.map(({ anchor }) => ({ selector, anchor })),
	)

	/** Правила шапки, которые по взятому заголовку сдвигают, ведут переходом и прячут. */
	const moving = rules.filter(
		({ selector, decls }) =>
			selector.includes('.so-table__head-row:has(') &&
			selector.includes('[data-dragging=true]') &&
			decls.some(
				({ prop, value }) =>
					prop === 'translate' ||
					prop.startsWith('transition') ||
					(prop === 'display' && value === 'none'),
			),
	)

	return {
		numbered: {
			seen: numbered.length,
			misses: numbered
				.filter(({ selector }) => !selector.includes(CELL_CHAIN + CELL_NTH))
				.map(({ selector }) => selector),
		},
		cellTransitions: {
			seen: cellTransitions.length,
			misses: cellTransitions
				.filter(({ selector }) => !selector.includes(CELL_CHAIN))
				.map(({ selector }) => selector),
		},
		lists: {
			seen: lists.length,
			misses: lists
				.filter(({ value }) => !fromBody.test(value))
				.map(({ selector, value }) => `${selector} { ${value} }`),
		},
		setters: {
			seen: setters.length,
			misses: setters
				.filter(
					({ selector }) =>
						!selector.includes(FLAG) ||
						subjectOf(selector) !== '.so-table__body' ||
						!hasesOf(selector).some(
							({ argument, anchor }) =>
								isHead(anchor) && argument.includes('[data-dragging=true]'),
						),
				)
				.map(({ selector }) => selector),
		},
		anchored: {
			seen: anchored.length,
			misses: anchored
				.filter(({ anchor }) => !isHead(anchor))
				.map(({ selector }) => selector),
		},
		flagged: rules
			.filter(({ selector }) => selector.includes(FLAG))
			.filter(({ selector }) => hasesOf(selector).some(({ anchor }) => isRoot(anchor)))
			.map(({ selector }) => selector),
		moving: {
			seen: moving.length,
			misses: moving
				.filter(({ selector }) => !selector.includes(':not([data-still=true])'))
				.map(({ selector }) => selector),
		},
		rootHas: rules
			.filter(({ selector }) => hasesOf(selector).some(({ anchor }) => isRoot(anchor)))
			.map(({ selector }) => selector),
	}
}

const reports = await inspectThemes(inspect)

describe.each(reports)(
	'перестановка колонок Table: правила тела — только под признаком жеста · $name',
	({ report }) => {
		it('правило ячейки на номер колонки — под признаком корня, через тело и строку', () => {
			expect(report.numbered.misses).toEqual([])
		})

		it('переход ячеек тела — под признаком корня', () => {
			expect(report.cellTransitions.misses).toEqual([])
		})

		/**
		 * Переход ячеек тело получает от шапки, пока в ней есть взятый заголовок, —
		 * а не от одного признака корня. Колонка встаёт одной перерисовкой, но
		 * браузер может пересчитать стиль посреди неё — при переносе взятого
		 * заголовка с кнопкой под фокусом, — и к этому пересчёту меток на
		 * заголовках уже нет, а признак корня ещё есть. Переход, объявленный прямо
		 * под признаком, вёл в этом пересчёте ячейки соседей от сдвига к нулю, и
		 * покой его не гасил (`playground/vue/browser/table.spec.ts`, «ничего не
		 * отъезжает»).
		 *
		 * Поэтому список переходов ячейки — только переменная тела, без неё —
		 * `none`, а ставит переменную тело по `:has()` шапки со взятым заголовком,
		 * под признаком корня.
		 */
		it('что идёт переходом, ячейка берёт у тела, а тело — у взятого заголовка', () => {
			expect(report.lists.misses).toEqual([])
			expect(report.setters.misses).toEqual([])
		})

		it(':has() с :nth-child( — только у шапки', () => {
			expect(report.anchored.misses).toEqual([])
		})

		it('в правилах под признаком у корня таблицы нет :has()', () => {
			expect(report.flagged).toEqual([])
		})

		/**
		 * Шапка стоит (`reorderPreview: 'none'`, у взятого `data-still`): соседи
		 * без нулевого сдвига и перехода — слоёв у заголовков нет, — а линия места
		 * видна и с движением. Правила шапки, которые по взятому заголовку дают
		 * соседям сдвиг, переход или прячут линию, взятого с `data-still` не видят.
		 */
		it('сдвиг, переход и скрытие линии по взятому — не при data-still', () => {
			expect(report.moving.misses).toEqual([])
		})
	},
)

describe.each(reports)('Table: у корня нет :has() · $name', ({ report }) => {
	/**
	 * Условие на детей корня браузер проверяет обходом на глубину три — по всем
	 * строкам и ячейкам тела — на каждом пересчёте стиля корня, и совпадение в
	 * шапке обход не сокращает. Окно (`.so-table__viewport:has(> .so-table…)`) —
	 * не корень: под ним одна таблица. Курсор жеста — тоже признак корня
	 * (`data-resizing`, `data-dragging`), а не условие по заголовкам.
	 */
	it('условие на детей — не у корня таблицы', () => {
		expect(report.rootHas).toEqual([])
	})
})

describe('сторож не пуст', () => {
	const report = reportOf(reports, OREN)

	it('у oren правила ячеек на номер колонки есть — по одному на номер', () => {
		expect(report.numbered.seen).toBeGreaterThanOrEqual(30)
	})

	it('у oren есть переход ячеек, его список, переменная тела, условие шапки и сдвиг соседей', () => {
		expect(report.cellTransitions.seen).toBeGreaterThan(0)
		expect(report.lists.seen).toBeGreaterThan(0)
		expect(report.setters.seen).toBeGreaterThan(0)
		expect(report.anchored.seen).toBeGreaterThan(0)
		expect(report.moving.seen).toBeGreaterThan(0)
	})
})
