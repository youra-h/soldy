import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { build as viteBuild } from 'vite'
import postcss from 'postcss'
import type { AtRule, ChildNode, Container, Declaration, Rule } from 'postcss'

/**
 * Движение в теме — только надстройкой (`src/mixins/_motion.scss`).
 *
 * Режим движения у библиотеки один (корневой `AGENTS.md`, «Движение: один
 * режим на библиотеку»): по умолчанию — настройка системы
 * `prefers-reduced-motion`, а приложение задаёт свой атрибутом `data-s-motion`
 * на корне документа. Тема исполняет его одним миксином `motion.allowed`:
 * покой — база, движение — надстройка, и правило движения мимо неё не слушало
 * бы ни систему, ни приложение. Так ехала полоса Tabs `line`, пока карточка
 * `contained` рядом слушала систему.
 *
 * Сторожей двое:
 *
 * - **исходники** — медиазапрос движения и атрибут режима есть только в самом
 *   миксине: копия условия в файле компонента разошлась бы с ним;
 * - **собранный CSS** — движение вне правил надстройки. Читается то, что
 *   уезжает в пакет: `@apply` развёрнут (`transition-transform` — это
 *   `transform, translate, scale, rotate`), а сборка переписывает записи.
 *
 * Критерий — `AGENTS.md` темы, «Движение — надстройка». Движение — смена
 * места, размера, поворота и формы во времени: переход и анимация таких
 * свойств и плавная прокрутка. Не движение — цвет, прозрачность, тень,
 * `visibility` и `display` и анимация, которую ведёт прокрутка
 * (`animation-timeline: scroll()`): она идёт за пальцем. Свойство вне этого
 * списка — движение, `all` — тоже.
 */

const ROOT = resolve(import.meta.dirname, '..')
const SRC = join(ROOT, 'src')

/** Файл надстройки — единственное место условия движения в исходниках. */
const MOTION_MIXIN = 'mixins/_motion.scss'

/**
 * Корни правил надстройки в собранном CSS: без атрибута — пока система о
 * движении не просила (только внутри медиазапроса), при `full` — всегда.
 * Кавычки и пробелы сборка снимает, поэтому селектор сверяется без них.
 */
const SYSTEM_ROOT = ':where(:root:not([data-s-motion=reduce]))'
const FULL_ROOT = ':where(:root[data-s-motion=full])'
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

/** Сборка CSS — в памяти, тем же конфигом, что у `build:css`. */
async function buildCss(): Promise<string> {
	const result = await viteBuild({
		root: ROOT,
		configFile: resolve(ROOT, 'vite.config.ts'),
		logLevel: 'silent',
		build: { write: false },
	})

	for (const output of [result].flat()) {
		if (!('output' in output)) throw new Error('CSS-сборка ушла в режим наблюдения')

		for (const file of output.output) {
			if (file.type !== 'asset' || file.fileName !== 'index.css') continue

			return typeof file.source === 'string'
				? file.source
				: new TextDecoder().decode(file.source)
		}
	}

	throw new Error('CSS-сборка не отдала index.css')
}

/** Предки узла — правила и директивы, от ближайшего. */
function ancestorsOf(node: ChildNode): Container[] {
	const ancestors: Container[] = []

	for (let parent = node.parent; parent && parent.type !== 'root'; parent = parent.parent) {
		ancestors.push(parent)
	}

	return ancestors
}

const isAtRule = (node: Container): node is AtRule => node.type === 'atrule'
const isRule = (node: Container | undefined): node is Rule => node?.type === 'rule'

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

/** Источники стилей без комментариев. */
function styleFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry)

		if (statSync(path).isDirectory()) return styleFiles(path)

		return /\.s?css$/.test(path) ? [path] : []
	})
}

const sources = styleFiles(SRC).map((file) => ({
	name: relative(SRC, file).split('\\').join('/'),
	code: readFileSync(file, 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/.*$/gm, ''),
}))

describe('движение — исходники', () => {
	it.each(['prefers-reduced-motion', 'data-s-motion'])(
		'%s — только в миксине надстройки',
		(word) => {
			const found = sources.filter(({ code }) => code.includes(word)).map(({ name }) => name)

			expect(found).toEqual([MOTION_MIXIN])
		},
	)
})

describe('движение — собранный CSS', async () => {
	const css = postcss.parse(await buildCss())

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

	it('сборка дошла до правил надстройки', () => {
		// Без них проверки ниже прошли бы и на пустом CSS
		const motionRules = declarations.filter((decl) => !outside(decl))

		expect(motionRules.length).toBeGreaterThan(0)
		expect(keyframes.size).toBeGreaterThan(0)
	})

	it('переход вне надстройки ведёт только то, что не движение', () => {
		const moving = declarations
			.filter((decl) => ['transition', 'transition-property'].includes(prop(decl)))
			.filter(outside)
			.flatMap((decl) =>
				transitioned(decl)
					.filter((property) => property !== 'none' && !isStill(property))
					.map((property) => `${placeOf(decl)}: ${property}`),
			)

		expect(moving).toEqual([])
	})

	it('анимация вне надстройки — только кадры того, что не движение, или за прокруткой', () => {
		const moving = declarations
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

		expect(moving).toEqual([])
	})

	it('плавная прокрутка — только в надстройке', () => {
		const smooth = declarations
			.filter((decl) => prop(decl) === 'scroll-behavior' && decl.value.trim() === 'smooth')
			.filter(outside)
			.map(placeOf)

		expect(smooth).toEqual([])
	})

	/**
	 * Условие режима — только в форме надстройки: медиазапрос движения — одна
	 * «система не просила», и под ним каждый селектор от корня без `reduce`; от
	 * корня режима — только правила надстройки. Иначе правило слушало бы одну
	 * систему или одно приложение.
	 */
	it('условие режима — только в форме надстройки', () => {
		const wrong: string[] = []

		css.walkAtRules('media', (rule) => {
			if (!compact(rule.params).includes('prefers-reduced-motion')) return

			if (compact(rule.params) !== NO_PREFERENCE) wrong.push(`@media ${rule.params}`)
		})

		css.walkRules((rule) => {
			const conditioned =
				rule.selector.includes('data-s-motion') ||
				mediaOf(rule).some((media) => media.includes('prefers-reduced-motion'))

			if (conditioned && !isMotionRule(rule)) wrong.push(rule.selector)
		})

		expect(wrong).toEqual([])
	})
})
