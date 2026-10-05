import { describe, it, expect } from 'vitest'
import postcss from 'postcss'
import type { Rule } from 'postcss'

import { buildCss } from './build-css'

/**
 * Вариант Button и пилюли тега — только цвет: правило модификатора варианта
 * задаёт переменные `--s-tone-*` (`button-tones` в
 * `src/components/button/_mixins.scss`), а вид и его состояния объявлены один
 * раз на все цвета.
 *
 * Раньше вид разворачивался целиком на каждый вариант — и в каждом контексте:
 * у строк ListBox и Select, крестиков, кнопок Calendar, Dialog и Drawer, у
 * пилюль Tags по видам. Правило варианта сильнее правила нейтрали на класс, и
 * перекрыть его контекст и режим принудительных цветов могли только ещё одной
 * копией на вариант. Такие правила занимали больше половины CSS темы, и каждое
 * новое правило состояния вида добавляло к нему десятки килобайт. Правило с
 * модификатором варианта, которое пишет что-то кроме переменных, — возврат
 * этой матрицы.
 *
 * Читается собранный CSS: `@apply` развёрнут, вложенность раскрыта.
 */

const VARIANT = /\.s-(?:button|tags-item)--variant-[a-z]+/

describe('вариант Button и пилюли тега — только переменные цвета', async () => {
	const css = postcss.parse(await buildCss())

	const rules: Rule[] = []

	css.walkRules((rule) => {
		if (rule.selectors.some((selector) => VARIANT.test(selector))) rules.push(rule)
	})

	it('правила вариантов есть', () => {
		expect(rules.length).toBeGreaterThan(0)
	})

	it('правило варианта объявляет только переменные', () => {
		const misses = rules.flatMap((rule) =>
			rule.nodes.flatMap((node) =>
				node.type === 'decl' && !node.prop.startsWith('--')
					? [`${rule.selector} { ${node.prop} }`]
					: [],
			),
		)

		expect(misses).toEqual([])
	})

	it('у правила варианта нет состояний', () => {
		const states = rules
			.filter((rule) =>
				rule.selectors.some((selector) => /\[data-|:(?:hover|active|focus)/.test(selector)),
			)
			.map((rule) => rule.selector)

		expect(states).toEqual([])
	})
})
