/**
 * Видимая область как граница раскладки — общее для спеков, которые смотрят на
 * телепортированные панели (`tags-overflow.spec.ts`, `select-tags.spec.ts`).
 *
 * Граница здесь — `document.documentElement.clientWidth/clientHeight`: то же
 * место, куда сдвигает панель `TAnchorPlugin`
 * (`plugins/src/custom/frame/anchor/anchor.plugin.ts`), он берёт его у
 * `window.visualViewport`. Не `innerWidth`: тот считает своей классическую
 * полосу прокрутки, которая рисуется поверх страницы, и панель у самого края
 * пряталась бы под полосой, а сторож этого не видел.
 *
 * В самом прогоне две границы пока совпадают: Playwright в headless запускает
 * Chromium с `--hide-scrollbars`, и полоса не занимает места. Разойдутся они,
 * когда флаг снимут (869f54xfd) — тогда же здесь появится и спек Popover у
 * правого края.
 *
 * Одна копия на всех, как у `colors.ts`: разойдись две, один спек молча
 * сторожил бы другую границу.
 */

import { expect } from 'vitest'

/** Допуск на субпиксельное округление координат. */
const EPSILON = 0.5

/** Прямоугольник узла целиком в видимой области — ни одной стороной за краем. */
export const expectInsideWindow = (element: Element, what: string): void => {
	const box = element.getBoundingClientRect()
	const root = document.documentElement

	expect(box.left, `${what}: левый край`).toBeGreaterThanOrEqual(-EPSILON)
	expect(box.top, `${what}: верх`).toBeGreaterThanOrEqual(-EPSILON)
	expect(box.right, `${what}: правый край`).toBeLessThanOrEqual(root.clientWidth + EPSILON)
	expect(box.bottom, `${what}: низ`).toBeLessThanOrEqual(root.clientHeight + EPSILON)
}
