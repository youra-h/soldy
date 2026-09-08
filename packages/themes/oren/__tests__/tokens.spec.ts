import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = fileURLToPath(new URL('../src', import.meta.url))

/**
 * Комментарии выкусываются ДО разбора, иначе объяснения в шапках файлов
 * (в них встречаются примеры объявлений) прочитались бы как токены.
 */
function stripComments(css: string): string {
	return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** Тело блока по селектору — со счётчиком скобок, чтобы не поймать соседний. */
function block(css: string, selector: string): string {
	const start = css.indexOf(selector)
	expect(start, `селектор ${selector} не найден`).toBeGreaterThanOrEqual(0)

	const open = css.indexOf('{', start)
	let depth = 0

	for (let i = open; i < css.length; i++) {
		if (css[i] === '{') depth++
		if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i)
	}

	throw new Error(`не закрыт блок ${selector}`)
}

function declarations(body: string): Map<string, string> {
	const map = new Map<string, string>()

	for (const [, name, value] of body.matchAll(/(--s-[\w-]+)\s*:\s*([^;]+);/g)) {
		map.set(name, value.trim())
	}

	return map
}

/** Светлота из oklch(L C H) — первое число. */
function lightness(value: string): number {
	const match = value.match(/oklch\(\s*([\d.]+)/)
	expect(match, `не oklch: ${value}`).not.toBeNull()

	return Number(match![1])
}

function scaleOf(tokens: Map<string, string>, family: string): number[] {
	return [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) => {
		const value = tokens.get(`--s-${family}-${step}`)
		expect(value, `нет --s-${family}-${step}`).toBeDefined()

		return lightness(value!)
	})
}

function scssFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry)

		if (statSync(path).isDirectory()) return scssFiles(path)

		return path.endsWith('.scss') ? [path] : []
	})
}

const FAMILIES = ['accent', 'positive', 'negative', 'caution', 'neutral']

const light = declarations(
	block(stripComments(readFileSync(join(SRC, 'tokens.css'), 'utf8')), ':root,'),
)
const dark = declarations(
	block(
		stripComments(readFileSync(join(SRC, 'tokens-dark.css'), 'utf8')),
		"[data-theme='oren-dark']",
	),
)

describe('токены цветовых схем', () => {
	it('тёмная схема покрывает все ступени светлой', () => {
		const scaleTokens = (tokens: Map<string, string>) =>
			[...tokens.keys()].filter((name) => /^--s-\w+-\d+$/.test(name)).sort()

		expect(scaleTokens(dark)).toEqual(scaleTokens(light))
	})

	/**
	 * Опечатка в имени семантического токена не ломает сборку — он просто
	 * молча ни на что не влияет, и схема остаётся наполовину светлой.
	 */
	it('семантические токены тёмной схемы существуют в светлой', () => {
		const semantic = (tokens: Map<string, string>) =>
			[...tokens.keys()].filter((name) => name.startsWith('--s-component-'))

		for (const name of semantic(dark)) {
			expect(semantic(light), `${name} не объявлен в светлой схеме`).toContain(name)
		}
	})

	/**
	 * Главный инвариант всей затеи: номер ступени — это роль (расстояние от
	 * поверхности), а не светлота. В светлой схеме шкала идёт вниз по
	 * светлоте, в тёмной — вверх. Сломай это — и вся арифметика
	 * «hover = ступень + 100» в миксинах поедет в обратную сторону.
	 */
	it.each(FAMILIES)('светлая схема: шкала %s темнеет от 50 к 950', (family) => {
		const scale = scaleOf(light, family)

		for (let i = 1; i < scale.length; i++) {
			expect(scale[i], `ступень ${i} светлее предыдущей`).toBeLessThan(scale[i - 1])
		}
	})

	it.each(FAMILIES)('тёмная схема: шкала %s светлеет от 50 к 950', (family) => {
		const scale = scaleOf(dark, family)

		for (let i = 1; i < scale.length; i++) {
			expect(scale[i], `ступень ${i} темнее предыдущей`).toBeGreaterThan(scale[i - 1])
		}
	})

	/** Поверхность обязана быть тёмной, текст — светлым, иначе схема не тёмная. */
	it('в тёмной схеме поверхность темнее текста', () => {
		expect(lightness(dark.get('--s-neutral-50')!)).toBeLessThan(0.3)
		expect(lightness(dark.get('--s-neutral-800')!)).toBeGreaterThan(0.7)
	})
})

describe('компоненты не берут цвет мимо темы', () => {
	const TAILWIND_PALETTE =
		'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone'

	/**
	 * Код без комментариев. Комментарии выкусываются не для скорости: в них
	 * лежат объяснения этих самых запретов, и сканер поймал бы их как
	 * нарушения. Ровно та же ловушка, что и у сканера Tailwind, который
	 * читает комментарии и генерирует утилиты по упомянутым в них именам.
	 */
	const sources = [...scssFiles(join(SRC, 'components')), ...scssFiles(join(SRC, 'mixins'))].map(
		(file) => ({
			name: relative(SRC, file),
			code: readFileSync(file, 'utf8')
				.replace(/\/\*[\s\S]*?\*\//g, '')
				.replace(/\/\/.*$/gm, ''),
		}),
	)

	function scan(pattern: RegExp): string[] {
		return sources.flatMap(({ name, code }) =>
			[...code.matchAll(pattern)].map(([match]) => `${name}: ${match}`),
		)
	}

	/**
	 * Палитра Tailwind живёт мимо `--s-*`, значит пакет темы её не видит:
	 * такой цвет одинаков во всех темах и во всех цветовых схемах.
	 */
	it('не используют палитру Tailwind вместо шкалы темы', () => {
		expect(
			scan(
				new RegExp(
					`\\b(?:bg|text|border|border-[trbl]|fill|stroke|ring|outline|divide|from|via|to)-(?:${TAILWIND_PALETTE})-\\d{2,3}\\b`,
					'g',
				),
			),
		).toEqual([])
	})

	/**
	 * `border-s` у Tailwind — это `border-inline-start`, поэтому утилита
	 * вида border-s-<семейство>-<ступень> разбирается им как «левая граница
	 * цветом из ПАЛИТРЫ TAILWIND» и лишней строкой перекрывает наш цвет
	 * слева. Ловится плохо: в светлой схеме два серых почти совпадают.
	 *
	 * Проверяем и интерполяцию в миксинах, и литерал в стилях.
	 *
	 * Имя класса здесь намеренно не написано целиком — сканер Tailwind
	 * читает исходники пакета вместе с комментариями, и упоминание в тексте
	 * само по себе породило бы утилиту с этим дефектом.
	 */
	it('не пишут цвет границы через border-s-, который Tailwind понимает как inline-start', () => {
		// Цифра после дефиса — это ширина (border-s-2), она законна.
		// Всё остальное на этом месте — цвет, а значит коллизия.
		expect(scan(/border-[se]-(?!\d)\S*/g)).toEqual([])
	})

	/**
	 * Белый фон не инвертируется вместе со шкалой и в тёмной схеме остался бы
	 * белым. Для этого есть `--s-component-surface` / `--s-component-knob`.
	 *
	 * `text-white` при этом законен: он лежит на насыщенной заливке
	 * (Button--filled), а середина хроматических шкал в обеих схемах
	 * остаётся насыщенной.
	 */
	it('не заливают фон белым или чёрным в обход токена', () => {
		expect(scan(/\bbg-(?:white|black)\b/g)).toEqual([])
	})
})
