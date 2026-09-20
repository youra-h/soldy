import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { compile } from 'sass'

/**
 * Контрол в подписи `Label` подсвечивается и от наведения на её текст.
 *
 * Клик по тексту контрол переключает, поэтому и курсор на тексте обязан
 * выглядеть как курсор на самом контроле. Браузеру это доверить нельзя:
 * наведение на подпись подписанному полю отдают не все — в Chrome, где нашли
 * ошибку, оно до поля не доходило. Поэтому правило подсветки срабатывает ещё и
 * по контексту наведённой подписи — `src/mixins/_hover.scss`.
 *
 * Сторож нужен именно здесь, хотя поведение браузерное: браузерный прогон
 * (`playground/vue/browser/label.spec.ts`) держит поведение, но видит его
 * в одном браузере, а тот, Chromium от Playwright, наведение полю отдаёт сам —
 * и без правила темы остаётся зелёным. Молча ломается ровно это: контекст
 * исчезает из правила, и подсветка пропадает там, куда прогон не достаёт.
 *
 * Селекторы берутся из собранного Sass, а не из текста файлов: их складывают
 * циклы и миксины, и целиком в исходнике их нет.
 */

const INDEX_SCSS = fileURLToPath(new URL('../src/index.scss', import.meta.url))

/** Контролы, которые подписывает `Label`. */
const CONTROLS = ['s-check-box', 's-switch', 's-radio-group-item']

/** Контекст: контрол под наведённой подписью. `:where` — нулевая специфичность. */
const CONTEXT = ':where(.s-label:hover>.s-label__control *)'

/**
 * Контекст стоит альтернативой `:hover` в том же `:is(…)`. Так специфичность
 * правила не меняется — у `:is()` она равна самому сильному аргументу, то есть
 * `:hover`, — а hover-правила контролов выверены против выключенного и
 * отмеченного состояния порядком и специфичностью.
 */
const ALTERNATIVE = `:is(:hover,${CONTEXT}`

/** Пробелы вокруг комбинаторов и запятых Sass расставляет по-своему. */
const squash = (selector: string) => selector.replace(/\s+/g, ' ').replace(/\s*([>,])\s*/g, '$1')

/** Селекторы собранной темы: всё, что стоит перед телом правила, кроме at-правил. */
function selectors(): string[] {
	const css = compile(INDEX_SCSS).css.replace(/\/\*[\s\S]*?\*\//g, '')

	return [...css.matchAll(/([^{}]+)\{/g)]
		.map(([, selector]) => squash(selector.trim()))
		.filter((selector) => !selector.startsWith('@'))
}

/** Правила наведения блока: селектор упоминает и блок, и `:hover`. */
const hoverRules = (block: string): string[] =>
	selectors().filter((selector) => selector.includes(`.${block}`) && selector.includes(':hover'))

describe('подсветка контрола в подписи', () => {
	it.each(CONTROLS)(
		'%s: наведение на подпись красит его так же, как наведение на него',
		(block) => {
			const rules = hoverRules(block)

			expect(rules.length, `правил наведения у .${block} не нашлось`).toBeGreaterThan(0)
			expect(rules.filter((selector) => !selector.includes(CONTEXT))).toEqual([])
		},
	)

	it.each(CONTROLS)('%s: контекст не меняет специфичность правила', (block) => {
		expect(hoverRules(block).filter((selector) => !selector.includes(ALTERNATIVE))).toEqual([])
	})
})
