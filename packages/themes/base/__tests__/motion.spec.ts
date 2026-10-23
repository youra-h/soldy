import { describe, it, expect } from 'vitest'
import postcss from 'postcss'
import type { AtRule, ChildNode, Container, Declaration, Rule } from 'postcss'

import { OREN, inspectThemes, reportOf } from './themes'

/**
 * Движение в теме — только надстройкой.
 *
 * Режим движения у библиотеки один (корневой `AGENTS.md`, «Движение: один
 * режим на библиотеку»): по умолчанию — настройка системы
 * `prefers-reduced-motion`, а приложение задаёт свой атрибутом `data-so-motion`
 * на корне документа. Тема исполняет его воротами — парой селекторов: покой —
 * база, движение — надстройка, и правило движения мимо них не слушало бы ни
 * систему, ни приложение. Так у oren ехала полоса Tabs `line`, пока карточка
 * `contained` рядом слушала систему. Форма ворот общая для любой темы, и
 * сторож проходит по каждой теме репозитория; как тема их пишет — её дело (у
 * oren — миксин `motion.allowed`, и что условие режима есть только в нём,
 * сторожит её `__tests__/motion.spec.ts` по исходникам).
 *
 * Читается собранный CSS темы (`themes.ts`) — то, что уезжает в пакет:
 * `@apply` развёрнут (`transition-transform` — это `transform, translate,
 * scale, rotate`), а сборка переписывает записи.
 *
 * Критерий — `packages/themes/oren/AGENTS.md`, «Движение — надстройка».
 * Движение — смена места, размера, поворота и формы во времени: переход и
 * анимация таких свойств и плавная прокрутка. Не движение — цвет,
 * прозрачность, тень, `visibility` и `display` и анимация, которую ведёт
 * прокрутка (`animation-timeline: scroll()`): она идёт за пальцем. Свойство
 * вне этого списка — движение, `all` — тоже.
 */

/**
 * Корни правил надстройки в собранном CSS: без атрибута — пока система о
 * движении не просила (только внутри медиазапроса), при `full` — всегда.
 * Кавычки и пробелы сборка снимает, поэтому селектор сверяется без них.
 */
const SYSTEM_ROOT = ':where(:root:not([data-so-motion=reduce]))'
const FULL_ROOT = ':where(:root[data-so-motion=full])'
const NO_PREFERENCE = '(prefers-reduced-motion:no-preference)'

/** Свойства, переход и анимация которых — не движение. */
const NOT_MOTION = new Set([
	'opacity',
	'visibility',
	'display',
	'color',
	'fill',
	'stroke',
	'box-shadow',
	'text-shadow',
	// Цвета градиента: их переводит `transition-colors` Tailwind
	'--tw-gradient-from',
	'--tw-gradient-via',
	'--tw-gradient-to',
])

/** Не движение ли переход или анимация свойства: список выше и любой цвет. */
const isStill = (property: string): boolean =>
	NOT_MOTION.has(property) || (!property.startsWith('--') && property.endsWith('-color'))

/** Слова записи перехода и анимации, которые не имя свойства и не имя кадров. */
const TIMING_WORDS = new Set([
	'linear',
	'ease',
	'ease-in',
	'ease-out',
	'ease-in-out',
	'step-start',
	'step-end',
	'allow-discrete',
	'normal',
	'reverse',
	'alternate',
	'alternate-reverse',
	'forwards',
	'backwards',
	'both',
	'running',
	'paused',
	'infinite',
	'auto',
])

/** Длительность, задержка и число повторов — не имя. */
const NUMBER = /^-?[\d.]+(m?s)?$/

/** Значение, разбитое по запятым и пробелам верхнего уровня, без функций. */
function itemsOf(value: string): string[][] {
	return postcss.list
		.comma(value)
		.map((item) => postcss.list.space(item).filter((token) => !token.includes('(')))
}

/** Имена в одной записи перехода или анимации: то, что не время и не кривая. */
const namesOf = (tokens: readonly string[]): string[] =>
	tokens.filter((token) => !NUMBER.test(token) && !TIMING_WORDS.has(token))

/** Свойства, которые переход ведёт; `all` — у записи без свойства. */
function transitioned(decl: Declaration): string[] {
	if (decl.prop === 'transition-property') return postcss.list.comma(decl.value)

	return itemsOf(decl.value).flatMap((tokens) => {
		const [name = 'all'] = namesOf(tokens)

		return [name]
	})
}

/** Имена кадров в записи анимации. */
function animated(decl: Declaration): string[] {
	if (decl.prop === 'animation-name') return postcss.list.comma(decl.value)

	return itemsOf(decl.value).flatMap(namesOf)
}

const isAtRule = (node: Container): node is AtRule => node.type === 'atrule'
const isRule = (node: Container | undefined): node is Rule => node?.type === 'rule'

/** Предок, который сам вложен: правило или директива, а не корень. */
const isNested = (node: Container | undefined): node is AtRule | Rule =>
	node !== undefined && (isAtRule(node) || isRule(node))

/** Предки узла — правила и директивы, от ближайшего. */
function ancestorsOf(node: ChildNode): (AtRule | Rule)[] {
	const ancestors: (AtRule | Rule)[] = []

	for (let parent = node.parent; isNested(parent); parent = parent.parent) {
		ancestors.push(parent)
	}

	return ancestors
}

const compact = (text: string) => text.replace(/['"\s]/g, '')

/** Медиазапросы, внутри которых лежит узел. */
const mediaOf = (node: ChildNode): string[] =>
	ancestorsOf(node)
		.filter(isAtRule)
		.filter(({ name }) => name === 'media')
		.map(({ params }) => compact(params))

/**
 * Правило надстройки: каждый селектор — от корня режима, а корень без
 * атрибута — только под медиазапросом «система не просила».
 */
function isMotionRule(rule: Rule): boolean {
	const media = mediaOf(rule)

	return rule.selectors.every((selector) => {
		const plain = compact(selector)

		return (
			plain.startsWith(FULL_ROOT) ||
			(plain.startsWith(SYSTEM_ROOT) && media.includes(NO_PREFERENCE))
		)
	})
}

/** Что сторож нашёл в CSS темы. */
function inspect(source: string) {
	const css = postcss.parse(source)

	/** Кадры по имени — свойства, которые они ведут. */
	const keyframes = new Map<string, Set<string>>()

	css.walkAtRules('keyframes', (rule) => {
		const properties = keyframes.get(rule.params) ?? new Set<string>()

		rule.walkDecls(({ prop }) => {
			properties.add(prop)
		})
		keyframes.set(rule.params, properties)
	})

	/** Объявления движения и смены вида — вне кадров. */
	const declarations: Declaration[] = []

	css.walkDecls((decl) => {
		const inFrames = ancestorsOf(decl).some(
			(node) => isAtRule(node) && node.name === 'keyframes',
		)

		if (!inFrames) declarations.push(decl)
	})

	const prop = (decl: Declaration) => decl.prop.replace(/^-(webkit|moz)-/, '')

	/** Где объявление: селектор с медиазапросом. */
	const placeOf = (decl: Declaration): string => {
		const rule = decl.parent
		const selector = isRule(rule) ? rule.selector : '(не правило)'
		const media = mediaOf(decl)

		return media.length > 0 ? `@media ${media.join(' ')} ${selector}` : selector
	}

	const outside = (decl: Declaration): boolean =>
		!(isRule(decl.parent) && isMotionRule(decl.parent))

	/** Ведёт ли анимацию правила прокрутка, а не время: такая идёт за пальцем. */
	const scrollDriven = (decl: Declaration): boolean =>
		decl.parent?.some(
			(node) =>
				node.type === 'decl' &&
				node.prop === 'animation-timeline' &&
				postcss.list.comma(node.value).every((value) => /^(scroll|view)\(/.test(value)),
		) ?? false

	/** Переходы движения вне надстройки. */
	const transitions = declarations
		.filter((decl) => ['transition', 'transition-property'].includes(prop(decl)))
		.filter(outside)
		.flatMap((decl) =>
			transitioned(decl)
				.filter((property) => property !== 'none' && !isStill(property))
				.map((property) => `${placeOf(decl)}: ${property}`),
		)

	/** Анимации движения вне надстройки. */
	const animations = declarations
		.filter((decl) => ['animation', 'animation-name'].includes(prop(decl)))
		.filter(outside)
		.filter((decl) => !scrollDriven(decl))
		.flatMap((decl) =>
			animated(decl)
				.filter((name) => name !== 'none')
				.filter((name) => {
					const properties = keyframes.get(name)

					// Кадров нет — что они ведут, не узнать: считаем движением
					return !properties || [...properties].some((property) => !isStill(property))
				})
				.map((name) => `${placeOf(decl)}: ${name}`),
		)

	/** Плавная прокрутка вне надстройки. */
	const smooth = declarations
		.filter((decl) => prop(decl) === 'scroll-behavior' && decl.value.trim() === 'smooth')
		.filter(outside)
		.map(placeOf)

	/**
	 * Условие режима не в форме надстройки: медиазапрос движения — только «система
	 * не просила», и под ним каждый селектор от корня без `reduce`; от корня
	 * режима — только правила надстройки. Иначе правило слушало бы одну систему
	 * или одно приложение.
	 */
	const conditions: string[] = []

	css.walkAtRules('media', (rule) => {
		if (!compact(rule.params).includes('prefers-reduced-motion')) return

		if (compact(rule.params) !== NO_PREFERENCE) conditions.push(`@media ${rule.params}`)
	})

	css.walkRules((rule) => {
		const conditioned =
			rule.selector.includes('data-so-motion') ||
			mediaOf(rule).some((media) => media.includes('prefers-reduced-motion'))

		if (conditioned && !isMotionRule(rule)) conditions.push(rule.selector)
	})

	return {
		motionRules: declarations.filter((decl) => !outside(decl)).length,
		keyframes: keyframes.size,
		transitions,
		animations,
		smooth,
		conditions,
	}
}

const reports = await inspectThemes(inspect)

describe.each(reports)('движение — только надстройкой · $name', ({ report }) => {
	it('переход вне надстройки ведёт только то, что не движение', () => {
		expect(report.transitions).toEqual([])
	})

	it('анимация вне надстройки — только кадры того, что не движение, или за прокруткой', () => {
		expect(report.animations).toEqual([])
	})

	it('плавная прокрутка — только в надстройке', () => {
		expect(report.smooth).toEqual([])
	})

	it('условие режима — только в форме надстройки', () => {
		expect(report.conditions).toEqual([])
	})
})

describe('сторож не пуст', () => {
	it('у oren сборка дошла до правил надстройки и до кадров', () => {
		// Без них проверки выше прошли бы и на пустом CSS
		const { motionRules, keyframes } = reportOf(reports, OREN)

		expect(motionRules).toBeGreaterThan(0)
		expect(keyframes).toBeGreaterThan(0)
	})
})
