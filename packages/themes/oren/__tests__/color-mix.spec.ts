import { describe, it, expect } from 'vitest'
import postcss from 'postcss'
import type { Container, Declaration, Rule } from 'postcss'

import { buildCss } from './build-css'

/**
 * У `color-mix()` в собранном CSS нет запасного значения.
 *
 * Полифил Tailwind (`Polyfills.ColorMix`) ставил к каждому объявлению с
 * `color-mix()` и `var()` запасное значение, а оригинал прятал под
 * `@supports (color: color-mix(in lab, red, red))`: 263 блока и 52 КБ из
 * 402. Запасным был первый цвет смеси — у вуали непрозрачная ступень 500
 * вместо слоя в 8 %, — а браузер без `color-mix()` тема не поддерживает и без
 * того: палитра у неё — `oklch()`. Поэтому сборка зовёт Tailwind без этого
 * полифила (`tailwind-postcss.ts`), а своих запасных значений тема не пишет —
 * ни под `@supports`, ни объявлением того же свойства перед смесью
 * (`AGENTS.md` темы, «Браузеры темы: с `color-mix()` и `oklch()`»).
 *
 * Читается то, что уезжает в пакет: полифил пишет компилятор Tailwind, и в
 * исходниках его не видно.
 */

const isRule = (node: Container | undefined): node is Rule => node?.type === 'rule'

const isMix = (decl: Declaration) => decl.value.includes('color-mix(')

/** Где объявление: селектор правила и свойство. */
const placeOf = (decl: Declaration): string =>
	`${isRule(decl.parent) ? decl.parent.selector : '(не правило)'}: ${decl.prop}`

describe('color-mix() — без запасного значения', async () => {
	const css = postcss.parse(await buildCss())

	it('сборка дошла до смесей', () => {
		// Без них проверки ниже прошли бы и на пустом CSS
		const mixes: Declaration[] = []

		css.walkDecls((decl) => {
			if (isMix(decl)) mixes.push(decl)
		})

		expect(mixes.length).toBeGreaterThan(0)
	})

	it('смесь не стоит под @supports с color-mix() в условии', () => {
		const guarded: string[] = []

		css.walkAtRules('supports', (rule) => {
			if (!rule.params.includes('color-mix(')) return

			rule.walkDecls((decl) => {
				guarded.push(`@supports ${rule.params} ${placeOf(decl)}`)
			})
		})

		expect(guarded).toEqual([])
	})

	it('перед смесью то же свойство в её правиле не объявлено', () => {
		const fallbacks: string[] = []

		css.walkRules((rule) => {
			const declared = new Set<string>()

			rule.each((node) => {
				if (node.type !== 'decl') return

				if (isMix(node) && declared.has(node.prop)) fallbacks.push(placeOf(node))

				declared.add(node.prop)
			})
		})

		expect(fallbacks).toEqual([])
	})
})
