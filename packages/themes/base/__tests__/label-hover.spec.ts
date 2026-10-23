import { describe, it, expect } from 'vitest'
import postcss from 'postcss'

import { OREN, inspectThemes, reportOf } from './themes'

/**
 * Контрол в подписи `Label` подсвечивается и от наведения на её текст.
 *
 * Клик по тексту контрол переключает, поэтому и курсор на тексте обязан
 * выглядеть как курсор на самом контроле. Браузеру это доверить нельзя:
 * наведение на подпись подписанному полю отдают не все — в Chrome, где нашли
 * ошибку, оно до поля не доходило. Поэтому правило подсветки срабатывает ещё и
 * по контексту наведённой подписи. Это форма селектора, а не облик одной
 * темы, и сторож проходит по каждой теме репозитория: у oren её пишет
 * `src/mixins/_hover.scss`.
 *
 * Сторож нужен именно здесь, хотя поведение браузерное: браузерный прогон
 * (`playground/vue/browser/label.spec.ts`) держит поведение, но видит его
 * в одном браузере, а тот, Chromium от Playwright, наведение полю отдаёт сам —
 * и без правила темы остаётся зелёным. Молча ломается ровно это: контекст
 * исчезает из правила, и подсветка пропадает там, куда прогон не достаёт.
 *
 * Селекторы берутся из собранного CSS темы (`themes.ts`): их складывают
 * циклы, миксины и `@apply`, и целиком в исходниках их нет.
 */

/** Контролы, которые подписывает `Label`. */
const CONTROLS = ['so-check-box', 'so-switch', 'so-radio-group-item']

/** Контекст: контрол под наведённой подписью. `:where` — нулевая специфичность. */
const CONTEXT = ':where(.so-label:hover>.so-label__control *)'

/**
 * Контекст стоит альтернативой `:hover` в том же `:is(…)`. Так специфичность
 * правила не меняется — у `:is()` она равна самому сильному аргументу, то есть
 * `:hover`, — а hover-правила контролов выверены против выключенного и
 * отмеченного состояния порядком и специфичностью.
 */
const ALTERNATIVE = `:is(:hover,${CONTEXT}`

/** Пробелы вокруг комбинаторов и запятых сборки бывают разными. */
const squash = (selector: string) => selector.replace(/\s+/g, ' ').replace(/\s*([>,])\s*/g, '$1')

/** Правила наведения каждого контрола: селектор упоминает и блок, и `:hover`. */
function inspect(source: string): Map<string, string[]> {
	const selectors: string[] = []

	postcss.parse(source).walkRules((rule) => {
		selectors.push(...rule.selectors.map(squash))
	})

	return new Map(
		CONTROLS.map((block) => [
			block,
			selectors.filter(
				(selector) => selector.includes(`.${block}`) && selector.includes(':hover'),
			),
		]),
	)
}

const reports = await inspectThemes(inspect)

describe.each(reports)('подсветка контрола в подписи · $name', ({ report }) => {
	it.each(CONTROLS)(
		'%s: наведение на подпись красит его так же, как наведение на него',
		(block) => {
			const rules = report.get(block) ?? []

			expect(rules.filter((selector) => !selector.includes(CONTEXT))).toEqual([])
		},
	)

	it.each(CONTROLS)('%s: контекст не меняет специфичность правила', (block) => {
		const rules = report.get(block) ?? []

		expect(rules.filter((selector) => !selector.includes(ALTERNATIVE))).toEqual([])
	})
})

describe('сторож не пуст', () => {
	it.each(CONTROLS)('у oren есть правила наведения %s', (block) => {
		expect(reportOf(reports, OREN).get(block) ?? []).not.toEqual([])
	})
})
