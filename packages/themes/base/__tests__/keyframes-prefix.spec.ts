import { describe, it, expect } from 'vitest'
import postcss from 'postcss'

import { OREN, inspectThemes, reportOf } from './themes'

/**
 * Кадры анимаций темы названы по схеме `so-`, как классы, которые она
 * красит: `so-skeleton-pulse` рядом с `so-progress-pulse`. Правило общее для
 * любой темы (корневой `AGENTS.md`, «Префикс — только в глобальном
 * пространстве имён»), и сторож проходит по каждой теме репозитория.
 *
 * Имена `@keyframes` у документа общие, как классы: кадры приложения с тем же
 * именем заменили бы кадры темы или были бы заменены ими — смотря чьи стили
 * подключены позже. Пульсация заглушки и бег волны без префикса назывались бы
 * так, как их легко назовёт и приложение.
 *
 * Читается собранный CSS темы (`themes.ts`): кадры в нём объявляют не только
 * исходники темы — Tailwind выпускает свои под утилиту анимации в `@apply`
 * (`animate-spin` — кадры `spin`).
 */

/** Имя кадров без кавычек: `@keyframes "x"` — то же имя, что `@keyframes x`. */
const nameOf = (params: string) => params.trim().replace(/^(['"])(.*)\1$/, '$2')

/** Имена кадров в CSS темы. */
function inspect(source: string): string[] {
	const names: string[] = []

	// И с префиксом браузера: `@-webkit-keyframes` — то же пространство имён
	postcss.parse(source).walkAtRules(/^(-\w+-)?keyframes$/, (rule) => {
		names.push(nameOf(rule.params))
	})

	return names
}

const reports = await inspectThemes(inspect)

describe.each(reports)('кадры анимаций — с префиксом so- · $name', ({ report }) => {
	it('имя каждых кадров начинается с so-', () => {
		expect(report.filter((name) => !name.startsWith('so-'))).toEqual([])
	})
})

describe('сторож не пуст', () => {
	it('у oren сборка дошла до кадров', () => {
		// Без них проверка выше прошла бы и на CSS без единой анимации
		expect(reportOf(reports, OREN).length).toBeGreaterThan(0)
	})
})
