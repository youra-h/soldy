/**
 * Видимая область как граница раскладки — общее для спеков, которые смотрят на
 * телепортированные панели (`anchor.spec.ts`, `tags-overflow.spec.ts`,
 * `select-tags.spec.ts`).
 *
 * Граница здесь — `document.documentElement.clientWidth/clientHeight`: то же
 * место, куда сдвигает панель `TAnchorPlugin`
 * (`plugins/src/custom/frame/anchor/anchor.plugin.ts`), он берёт его у
 * `window.visualViewport`. Не `innerWidth`: тот считает своей классическую
 * полосу прокрутки, которая рисуется поверх страницы, и панель у самого края
 * пряталась бы под полосой, а сторож этого не видел.
 *
 * В прогоне границы расходятся по-настоящему: флаг `--hide-scrollbars`, с
 * которым Playwright запускает Chromium в headless, снят
 * (`vitest.browser.config.ts`). Без этого полоса не занимала места, три
 * границы совпадали, и сторож раскладки у края окна был пуст. Что полоса в
 * прогоне классическая, проверяет `expectClassicScrollbar` — её зовут первой
 * те спеки, ради которых флаг и снят.
 *
 * Одна копия на всех, как у `colors.ts`: разойдись две, один спек молча
 * сторожил бы другую границу.
 */

import { expect } from 'vitest'

/** Допуск на субпиксельное округление координат. */
const EPSILON = 0.5

/**
 * Полоса прокрутки в прогоне занимает место — то есть `innerWidth` и
 * `clientWidth` действительно разные.
 *
 * Без этой проверки сторож «панель не уехала под полосу» проходит сам собой:
 * при накладной полосе (или вернувшемся `--hide-scrollbars`) прятаться не
 * подо что, и он зелёный при любой реализации. Зовётся первой, до самих
 * ассертов раскладки.
 */
export const expectClassicScrollbar = (): void => {
	expect(
		window.innerWidth - document.documentElement.clientWidth,
		'полоса прокрутки занимает место',
	).toBeGreaterThan(0)
}

/** Прямоугольник узла целиком в видимой области — ни одной стороной за краем. */
export const expectInsideWindow = (element: Element, what: string): void => {
	const box = element.getBoundingClientRect()
	const root = document.documentElement

	expect(box.left, `${what}: левый край`).toBeGreaterThanOrEqual(-EPSILON)
	expect(box.top, `${what}: верх`).toBeGreaterThanOrEqual(-EPSILON)
	expect(box.right, `${what}: правый край`).toBeLessThanOrEqual(root.clientWidth + EPSILON)
	expect(box.bottom, `${what}: низ`).toBeLessThanOrEqual(root.clientHeight + EPSILON)
}
