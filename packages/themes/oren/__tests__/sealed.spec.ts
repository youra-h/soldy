import { describe, it, expect } from 'vitest'
import postcss from 'postcss'
import type { Rule } from 'postcss'
import parser from 'postcss-selector-parser'
import type { Attribute, Node as SelectorNode, Selector } from 'postcss-selector-parser'

import { buildCss } from './build-css'

/**
 * Тема не стилизует страницу (корневой `AGENTS.md`, «Темы: у пакета темы свои
 * инструкции»): её правила — только для узлов библиотеки.
 *
 * Каждый селектор каждого правила вне `@keyframes` обязан адресовать узел
 * `so-*`: класс `so-*` стоит в субъекте или в его предке по цепочке — не в
 * соседе и не внутри `:not()` и `:has()`. Класс — и в форме атрибута, которой
 * сброс называет любой узел библиотеки (`[class^='so-']`,
 * `[class*=' so-']`), — и внутри `:is()` и `:where()`, если он есть в каждом
 * их варианте. Селектор, который узла `so-*` не адресует (`:root`, блок схемы
 * `[data-so-theme=…]`, знак направления `[dir=…]`, начальные значения
 * регистраций `@property`), объявляет только переменные, а `:root` и блок
 * схемы — ещё и `color-scheme`. Из at-правил — только обёртки (`@media`,
 * `@supports`, `@container`, `@starting-style`), `@layer`, `@keyframes` и
 * `@property`: `@font-face`, `@import` и прочие задевают документ целиком.
 *
 * Читается собранный CSS: Sass, `@apply` и то, что выпускает Tailwind, в нём
 * развёрнуты. Так стережётся и preflight Tailwind: он сбрасывал все элементы
 * документа, и тема подключает Tailwind частями, без него (`src/base.css`), а
 * то, на что опирались части, даёт сброс узлов библиотеки (`src/reset.css`).
 */

/** At-правила, которые только оборачивают правила, — условие, слой, место. */
const WRAPPERS = new Set(['media', 'supports', 'container', 'starting-style', 'layer'])

/** Кадры анимации — и вендорные формы. */
const isKeyframes = (name: string) => /^(?:-[a-z]+-)?keyframes$/.test(name)

/** At-правило, которое тема вправе выпустить. */
const isAllowedAtRule = (name: string) =>
	WRAPPERS.has(name) || isKeyframes(name) || name === 'property'

/** Атрибут класса, который совпадает только с классом `so-*`. */
function isLibraryClassAttribute(node: Attribute): boolean {
	if (node.attribute !== 'class') return false

	const value = node.value ?? ''

	switch (node.operator) {
		case '^=':
		case '~=':
			return value.startsWith('so-')
		case '*=':
			return value.startsWith(' so-')
		default:
			return false
	}
}

/** Компаунды селектора и комбинатор справа от каждого; у субъекта его нет. */
function compoundsOf(selector: Selector): { nodes: SelectorNode[]; right: string | null }[] {
	/** Слева направо, у каждого — комбинатор слева от него. */
	const compounds: { nodes: SelectorNode[]; left: string | null }[] = [{ nodes: [], left: null }]

	for (const node of selector.nodes) {
		if (node.type === 'combinator') {
			compounds.push({ nodes: [], left: node.value.trim() || ' ' })
		} else if (node.type !== 'comment') {
			compounds[compounds.length - 1].nodes.push(node)
		}
	}

	return compounds.map(({ nodes }, index) => ({
		nodes,
		right: compounds[index + 1]?.left ?? null,
	}))
}

/**
 * Компаунд стоит на узле `so-*`: класс `so-*` в нём самом — или `:is()` и
 * `:where()`, каждый вариант которых адресует такой узел. Аргументы `:not()`,
 * `:has()` и прочих псевдоклассов не в счёт: `:has(.so-x)` — условие на
 * потомка, а не узел библиотеки.
 */
function isLibraryCompound(nodes: SelectorNode[]): boolean {
	return nodes.some((node) => {
		if (node.type === 'class') return node.value.startsWith('so-')
		if (node.type === 'attribute') return isLibraryClassAttribute(node)

		if (node.type === 'pseudo' && (node.value === ':is' || node.value === ':where')) {
			return node.nodes.length > 0 && node.nodes.every(addressesLibrary)
		}

		return false
	})
}

/**
 * Селектор адресует узел `so-*`: класс `so-*` — в субъекте или в предке по
 * цепочке. Предок — компаунд, справа от которого стоит комбинатор потомка или
 * ребёнка; сосед (`+`, `~`) — не предок, и правило по соседу части задело бы
 * узел приложения рядом с ней.
 */
function addressesLibrary(selector: Selector): boolean {
	return compoundsOf(selector).some(
		({ nodes, right }) =>
			(right === null || right === ' ' || right === '>') && isLibraryCompound(nodes),
	)
}

/** Корень документа или блок схемы — им можно объявить и `color-scheme`. */
const isSchemeBlock = (selector: string) =>
	selector === ':root' || /^\[data-so-theme(?:[~|^$*]?=[^\]]+)?\]$/.test(selector)

/** Разбор селектора — без правки. */
const selectorsOf = (selector: string): Selector[] => parser().astSync(selector).nodes

describe('тема не стилизует страницу', async () => {
	const css = postcss.parse(await buildCss())
	/** Правила внутри `@keyframes`: селекторы там — доли анимации. */
	const keyframes = new Set<Rule>()
	/** Правила вне `@keyframes` — сторож пуст, если их нет. */
	let rules = 0
	const unsealed: string[] = []
	const atRules: string[] = []

	css.walkAtRules((atRule) => {
		if (!isAllowedAtRule(atRule.name)) atRules.push(`@${atRule.name} ${atRule.params}`)
		if (isKeyframes(atRule.name)) atRule.walkRules((rule) => keyframes.add(rule))
	})

	css.walkRules((rule) => {
		if (keyframes.has(rule)) return

		rules++

		const properties = rule.nodes.flatMap((node) => (node.type === 'decl' ? [node.prop] : []))

		for (const selector of selectorsOf(rule.selector)) {
			if (addressesLibrary(selector)) continue

			const text = selector.toString().trim()
			const own = properties.filter(
				(property) =>
					!property.startsWith('--') &&
					!(property === 'color-scheme' && isSchemeBlock(text)),
			)

			if (own.length > 0) unsealed.push(`${text} { ${own.join(', ')} }`)
		}
	})

	it('сборка дошла до правил', () => {
		expect(rules).toBeGreaterThan(1000)
	})

	it('вне узлов so-* — только переменные, у корня и блока схемы — и color-scheme', () => {
		expect(unsealed).toEqual([])
	})

	it('at-правила — только обёртки, @layer, @keyframes и @property', () => {
		expect(atRules).toEqual([])
	})
})

describe('что сторож считает узлом библиотеки', () => {
	const addresses = (selector: string) => selectorsOf(selector).every(addressesLibrary)

	it('класс so-* в субъекте и в предке — да', () => {
		expect(addresses('.so-button')).toBe(true)
		expect(addresses('.so-input > input')).toBe(true)
		expect(addresses('.so-tabs .so-tabs-item::after')).toBe(true)
		expect(addresses(":where([class^='so-'], [class*=' so-'])::before")).toBe(true)
		expect(
			addresses(":where(button:is([class^='so-'], [class*=' so-']), .so-icon > svg)"),
		).toBe(true)
	})

	it('корень документа, сосед части, условие и класс без префикса — нет', () => {
		expect(addresses('body')).toBe(false)
		expect(addresses(':root')).toBe(false)
		expect(addresses('html:has(.so-dialog)')).toBe(false)
		expect(addresses(':not(.so-button)')).toBe(false)
		expect(addresses('.so-label + p')).toBe(false)
		expect(addresses(':where(.so-icon, svg)')).toBe(false)
		expect(addresses("[class*='so-']")).toBe(false)
		expect(addresses('.also-red')).toBe(false)
	})
})
