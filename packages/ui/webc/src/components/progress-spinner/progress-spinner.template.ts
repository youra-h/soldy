/**
 * Шаблон ProgressSpinner: только рисунок под `aria-hidden`, о ходе говорит роль
 * корня. Поле 16 × 16, радиус 7: при толщине темы 2 кольцо касается краёв;
 * `pathLength="1"` — доля из переменной корня ложится в штрих как есть.
 */

import type { IProgressSpinner } from '@soldy-ui/core'
import type { ITemplate } from '../../adapter'

/** Рисунок — элементы SVG: в пространстве имён HTML `<svg>` не нарисуется. */
const SVG = 'http://www.w3.org/2000/svg'

/** Снизу вверх: дорожка, дуга доли, бегущая дуга; бег — поворот всего рисунка темой. */
const CIRCLES = [
	{ part: 'track', fraction: false },
	{ part: 'range', fraction: true },
	{ part: 'runner', fraction: true },
] as const

export const progressSpinnerTemplate: ITemplate<IProgressSpinner> = {
	create: (root) => {
		const { ownerDocument } = root
		const ring = ownerDocument.createElementNS(SVG, 'svg')

		ring.setAttribute('class', 'so-progress-spinner__ring')
		ring.setAttribute('viewBox', '0 0 16 16')
		ring.setAttribute('aria-hidden', 'true')

		for (const { part, fraction } of CIRCLES) {
			const circle = ownerDocument.createElementNS(SVG, 'circle')

			circle.setAttribute('class', `so-progress-spinner__${part}`)
			circle.setAttribute('cx', '8')
			circle.setAttribute('cy', '8')
			circle.setAttribute('r', '7')

			if (fraction) circle.setAttribute('pathLength', '1')

			ring.appendChild(circle)
		}

		root.appendChild(ring)

		// Слотов нет: написанное внутри элемента не выводится
		return { slots: {} }
	},

	bindings: [],
}
