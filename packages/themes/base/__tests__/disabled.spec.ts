import { describe, it, expect } from 'vitest'
import postcss from 'postcss'
import type { Container, Rule } from 'postcss'

import { OREN, inspectThemes, reportOf } from './themes'

/**
 * Прозрачность выключенного ложится на поддерево один раз
 * (`packages/themes/oren/AGENTS.md`, «Выключенное гаснет целиком»): погасший
 * узел берёт её из переменной `--so-disabled-opacity`, а своим детям ставит
 * её единицей, и выключенное внутри погасшего второй раз не гаснет. Механизм
 * годится любой теме, и сторож проходит по каждой теме репозитория.
 *
 * Своя прозрачность в правиле выключенного — `opacity-50`, число, сброс
 * `opacity-100` у части — идёт мимо переменной: под погасшим предком она
 * ложится второй раз, а сброс расходится с первой же новой частью. Так у oren
 * гасли Tabs и Tags (`opacity-50` под модификатором, которого ядро не пишет),
 * так строке тега сбрасывали прозрачность внутри погасшей пилюли. Поэтому в
 * правиле выключенного прозрачность — только из переменной и одним значением
 * на тему: правило гашения у темы одно, и запасное значение у него тоже одно.
 *
 * Читается собранный CSS темы (`themes.ts`): `@apply` в нём развёрнут, и
 * утилита видна объявлением. Правило выключенного — то, в селекторе которого
 * `data-disabled` или `:disabled` стоят вне `:not(…)`: под `:not(…)` —
 * правило включённого. Как выглядит погасшее и что внутри него ничего не
 * гаснет второй раз, меряет браузер (`playground/vue/browser/disabled.spec.ts`).
 */

/** Прозрачность из переменной гашения: с запасным значением или без. */
const FROM_VARIABLE = /^var\(\s*--so-disabled-opacity\s*(?:,[^()]*)?\)$/

/** Селектор без `:not(…)` — вместе со вложенными скобками. */
function positive(selector: string): string {
	let result = ''
	let index = 0

	while (index < selector.length) {
		if (!selector.startsWith(':not(', index)) {
			result += selector[index]
			index++
			continue
		}

		let depth = 0
		let end = index + ':not'.length

		for (; end < selector.length; end++) {
			if (selector[end] === '(') depth++
			if (selector[end] === ')') depth--
			if (depth === 0) break
		}

		index = end + 1
	}

	return result
}

const isDisabled = (selector: string) =>
	/\[data-disabled=(?:true|"true"|'true')\]|:disabled/.test(positive(selector))

const isRule = (node: Container | undefined): node is Rule => node?.type === 'rule'

/** Правила выключенного с прозрачностью — селектор и её значение. */
function inspect(source: string): { selector: string; opacity: string }[] {
	const rules: { selector: string; opacity: string }[] = []

	postcss.parse(source).walkDecls('opacity', (decl) => {
		const rule = decl.parent

		if (!isRule(rule) || !rule.selectors.some(isDisabled)) return

		rules.push({ selector: rule.selector, opacity: decl.value })
	})

	return rules
}

const reports = await inspectThemes(inspect)

describe.each(reports)('выключенное гаснет только переменной · $name', ({ report }) => {
	it('прозрачность в правиле выключенного — только из --so-disabled-opacity', () => {
		expect(report.filter(({ opacity }) => !FROM_VARIABLE.test(opacity))).toEqual([])
	})

	it('значение у всех правил выключенного одно', () => {
		expect(new Set(report.map(({ opacity }) => opacity)).size).toBeLessThanOrEqual(1)
	})
})

describe('сторож не пуст', () => {
	it('у oren сборка дошла до правил выключенного', () => {
		// Без них проверки выше прошли бы и на CSS, где выключенное не гаснет вовсе
		expect(reportOf(reports, OREN).length).toBeGreaterThan(0)
	})
})
