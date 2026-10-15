import { describe, it, expect } from 'vitest'
import postcss from 'postcss'

import { buildCss } from './build-css'

/**
 * Кадры анимаций темы названы по схеме `so-`, как классы, которые она
 * красит: `so-skeleton-pulse` рядом с `so-progress-pulse`.
 *
 * Имена `@keyframes` у документа общие, как классы: кадры приложения с тем же
 * именем заменили бы кадры темы или были бы заменены ими — смотря чьи стили
 * подключены позже. Пульсация заглушки и бег волны без префикса назывались бы
 * так, как их легко назовёт и приложение.
 *
 * Читается собранный CSS, тем же конфигом, что у `build:css`: кадры в нём
 * объявляют не только исходники темы — Tailwind выпускает свои под утилиту
 * анимации в `@apply` (`animate-spin` — кадры `spin`).
 */

/** Имя кадров без кавычек: `@keyframes "x"` — то же имя, что `@keyframes x`. */
const nameOf = (params: string) => params.trim().replace(/^(['"])(.*)\1$/, '$2')

describe('кадры анимаций — с префиксом so-', async () => {
	const css = postcss.parse(await buildCss())
	const names: string[] = []

	// И с префиксом браузера: `@-webkit-keyframes` — то же пространство имён
	css.walkAtRules(/^(-\w+-)?keyframes$/, (rule) => {
		names.push(nameOf(rule.params))
	})

	it('сборка дошла до кадров', () => {
		// Без них проверка ниже прошла бы и на CSS без единой анимации
		expect(names.length).toBeGreaterThan(0)
	})

	it('имя каждых кадров начинается с so-', () => {
		expect(names.filter((name) => !name.startsWith('so-'))).toEqual([])
	})
})
