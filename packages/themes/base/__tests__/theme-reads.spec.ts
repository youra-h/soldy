import { describe, it, expect } from 'vitest'
import postcss from 'postcss'
import type { AtRule, ChildNode, Container, Root, Rule } from 'postcss'

import { behaviourVariables } from './behaviour'
import { BASE_READS, THEME_READS } from './contract'
import { OREN, inspectThemes, reportOf } from './themes'
import type { TTheme } from './themes'

/**
 * Тема читает только своё и контракт (`packages/themes/base/AGENTS.md`,
 * «Контракт: переменные темы»): каждая переменная `--so-*`, которую стили
 * темы читают, либо объявлена самой темой — в её правилах, `@property` или
 * поведении (`setup/`), — либо названа в `theme-variables.json`: в разделе
 * `base-reads` (что читает база: задаёт тема или пишет библиотека) или
 * `theme-reads` (что тема вправе читать сверх этого). Так контракт — полный
 * список того, на что новая тема может опереться: имя, которое тема взяла из
 * служебной механики базы, роняет сторож, и его либо вносят в контракт, либо
 * берут из него.
 *
 * The styles are the built CSS of the theme (`themes.ts`). The rules of the
 * shared layer of themes are in it in the layer `so` — at the top level, or
 * inside a layer of the theme (`base.so` in a theme on Tailwind) — and the
 * guard skips its reads and declarations: `base-css.spec.ts` guards them. The
 * layer is found by its first sublayer, the reset (`so.reset`), and not by
 * the name `so` alone: a theme may keep its own rules in a `so` of its own
 * (oren — `components.so.<part>`).
 */

/** Чтение переменной: `var(--x)` и `var(--x, запас)`. */
const READ = /var\(\s*(--so-[\w-]+)/g

const isAtRule = (node: Container): node is AtRule => node.type === 'atrule'
const isRule = (node: Container): node is Rule => node.type === 'rule'

/** Предок, который сам вложен: правило или директива, а не корень. */
const isNested = (node: Container | undefined): node is AtRule | Rule =>
	node !== undefined && (isAtRule(node) || isRule(node))

/** The layer of a node: the names of its `@layer` ancestors, outside in, through a dot. */
function layerOf(node: ChildNode): string {
	const names: string[] = []

	for (let parent = node.parent; isNested(parent); parent = parent.parent) {
		if (isAtRule(parent) && parent.name === 'layer') names.unshift(parent.params.trim())
	}

	return names.join('.')
}

/** The reset of the library's nodes — the first sublayer of the shared layer of themes. */
const RESET = /^(?:(.+)\.)?so\.reset$/

/**
 * The layer of the shared layer of themes in a sheet — the parent of its reset:
 * `so` or `base.so`. A sheet without the reset has no shared layer.
 */
function baseLayerOf(css: Root): string | undefined {
	let found: string | undefined

	css.walkAtRules('layer', (rule) => {
		const layer = [layerOf(rule), rule.params.trim()].filter(Boolean).join('.')
		const match = RESET.exec(layer)

		if (match && found === undefined) found = match[1] ? `${match[1]}.so` : 'so'
	})

	return found
}

/** A node of the shared layer of themes: its layer is that layer or one under it. */
function inBase(node: ChildNode, base: string | undefined): boolean {
	const layer = layerOf(node)

	return base !== undefined && (layer === base || layer.startsWith(`${base}.`))
}

type TReport = {
	/** Переменные `--so-*`, которые тема читает, с местом. */
	readonly reads: readonly { readonly place: string; readonly name: string }[]
	/** Объявленные темой: правилом, `@property` и поведением. */
	readonly own: ReadonlySet<string>
}

function inspect(source: string, theme: TTheme): TReport {
	const css = postcss.parse(source)
	const base = baseLayerOf(css)
	const reads: { place: string; name: string }[] = []
	const own = new Set(behaviourVariables(theme).map(({ name }) => name))

	css.walkDecls((decl) => {
		if (inBase(decl, base)) return

		if (decl.prop.startsWith('--')) own.add(decl.prop)

		const place = decl.parent?.type === 'rule' ? decl.parent.selector : '(не правило)'

		for (const [, name] of decl.value.matchAll(READ)) reads.push({ place, name })
	})

	css.walkAtRules('property', (rule) => {
		if (!inBase(rule, base)) own.add(rule.params.trim())
	})

	return { reads, own }
}

/** Чтения темы мимо контракта: не своё и не названное в нём. */
function unlisted({ reads, own }: TReport): string[] {
	const found = reads
		.filter(({ name }) => !own.has(name))
		.filter(({ name }) => !BASE_READS.includes(name) && !THEME_READS.includes(name))
		.map(({ place, name }) => `${name} ← ${place}`)

	return [...new Set(found)]
}

const reports = await inspectThemes(inspect)

describe.each(reports)('тема читает своё и контракт · $name', ({ report }) => {
	it('каждая переменная --so-*, которую тема читает, — её или из контракта', () => {
		expect(
			unlisted(report),
			'Тема читает только своё и theme-variables.json (packages/themes/base/AGENTS.md, ' +
				'«Контракт: переменные темы»): переменную механики базы, которой нет в контракте, ' +
				'новая тема найти не может. Нужна — внести в раздел theme-reads',
		).toEqual([])
	})
})

describe('сторож не пуст', () => {
	const report = reportOf(reports, OREN)
	const read = new Set(report.reads.map(({ name }) => name))

	it('у oren сторож видит чтения всех трёх видов', () => {
		// Свой токен, переменная раздела base-reads и раздела theme-reads:
		// пустой список прошёл бы проверку выше на любом CSS
		expect(read).toContain('--so-neutral-300')
		expect(report.own).toContain('--so-neutral-300')
		expect(read).toContain('--so-swipe-offset')
		expect(read).toContain('--so-dir-sign')
	})

	it('правила базы — не тема', () => {
		// Шкалу Button читает только база; у oren её чтений нет
		expect(read).not.toContain('--so-button-height-sm')
		expect(report.own).not.toContain('--so-button-height-sm')
	})

	it('чтение мимо контракта — нарушение; своё и контракт — нет', () => {
		const sample = (text: string) =>
			unlisted(inspect(text, { name: 'sample', dir: import.meta.dirname }))

		expect(sample('.so-x { width: var(--so-table-cells-1-shift) }')).toEqual([
			'--so-table-cells-1-shift ← .so-x',
		])
		expect(sample('.so-x { --so-x-gap: 1rem; gap: var(--so-x-gap) }')).toEqual([])
		expect(sample('.so-x { translate: var(--so-swipe-offset) var(--so-toasts-lift) }')).toEqual(
			[],
		)
		expect(
			sample(
				'@layer base { @layer so.reset {} @layer so.x { .so-x { width: var(--so-table-cells-1-shift) } } }',
			),
		).toEqual([])
		// A layer `so` of the theme's own is the theme, not the shared layer
		expect(
			sample(
				'@layer base.so.reset {} @layer components.so.x { .so-x { width: var(--so-table-cells-1-shift) } }',
			),
		).toEqual(['--so-table-cells-1-shift ← .so-x'])
	})
})
