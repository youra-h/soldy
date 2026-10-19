import { describe, it, expect } from 'vitest'
import postcss from 'postcss'
import type { Container, Rule } from 'postcss'

import { buildCss } from './build-css'

/**
 * Выключенное гаснет только утилитой `opacity-so-component-disabled`
 * (`AGENTS.md` темы, «Выключенное гаснет целиком»).
 *
 * Прозрачность утилиты — из переменной, которую погасший предок ставит своим
 * детям: выключенное внутри погасшего второй раз не гаснет. Своя прозрачность
 * в правиле выключенного — `opacity-50`, число, сброс `opacity-100` у части —
 * идёт мимо переменной: под погасшим предком она ложится второй раз, а сброс
 * расходится с первой же новой частью. Так гасли Tabs и Tags (`opacity-50`
 * под модификатором, которого ядро не пишет), так строке тега сбрасывали
 * прозрачность внутри погасшей пилюли.
 *
 * Читается собранный CSS: `@apply` в нём развёрнут, и утилита видна
 * объявлением. Правило выключенного — то, в селекторе которого `data-disabled`
 * или `:disabled` стоят вне `:not(…)`: под `:not(…)` — правило включённого.
 * Как выглядит погасшее и что внутри него ничего не гаснет второй раз, меряет
 * браузер (`playground/vue/browser/disabled.spec.ts`).
 */

/** Прозрачность утилиты так, как её пишет сборка. */
const DISABLED_OPACITY = 'var(--so-disabled-opacity,.35)'

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

describe('выключенное гаснет только утилитой', async () => {
	const css = postcss.parse(await buildCss())
	const rules: { selector: string; opacity: string }[] = []

	css.walkDecls('opacity', (decl) => {
		const rule = decl.parent

		if (!isRule(rule) || !rule.selectors.some(isDisabled)) return

		rules.push({ selector: rule.selector, opacity: decl.value })
	})

	it('сборка дошла до правил выключенного', () => {
		// Без них проверка ниже прошла бы и на CSS, где выключенное не гаснет вовсе
		expect(rules.length).toBeGreaterThan(0)
	})

	it('прозрачность в правиле выключенного — только из переменной утилиты', () => {
		expect(rules.filter(({ opacity }) => opacity !== DISABLED_OPACITY)).toEqual([])
	})
})
