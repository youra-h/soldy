/**
 * Шаблон ProgressSpinner.
 *
 * Корень — сам `<span is="so-progress-spinner">`: классы (размер и вариант —
 * `--size-*`, `--variant-*`), наборы (роль, значения и имя для скринридера,
 * бег `data-indeterminate`, `dir`) и долю готового — переменную
 * `--s-progress-spinner-fraction` стиль-выхода `fractionStyle` —
 * раскладывает на него база (`SoldyElement`). Здесь только рисунок: состав,
 * имена классов и геометрия, без привязок.
 *
 * Текста и слотов нет, как у линии: содержимое узла с ролью `progressbar`
 * скринридер не читает, а в кольцо размером с иконку число не влезет. Подпись
 * и число потребитель ставит рядом своей разметкой, а написанное внутри
 * элемента не выводится.
 *
 * Рисунок — декор под `aria-hidden`, как коробка CheckBox: о ходе работы
 * говорит роль корня. Три окружности одной геометрии — центр в середине поля
 * 16 × 16, радиус 7: при толщине темы 2 кольцо ровно касается краёв поля. Вид
 * — у темы: толщина, цвета, начало дуг сверху и бег. Длину дуг SVG меряет в
 * долях окружности (`pathLength="1"`): доля готового из переменной корня
 * ложится в штрих как есть.
 */

import type { IProgressSpinner } from '@soldy-ui/core'
import type { ITemplate } from '../../adapter'

/** Рисунок — элементы SVG: в пространстве имён HTML `<svg>` не нарисуется. */
const SVG = 'http://www.w3.org/2000/svg'

/**
 * Окружности рисунка снизу вверх: дорожка — полное кольцо под дугами; дуга
 * доли — от начала кольца на долю готового (пока кольцо бежит, тема её
 * прячет, и дуга, вернувшаяся после бега, растёт от нуля); бегущая дуга —
 * видна, только пока кольцо бежит, своего движения у неё нет: бег — поворот
 * всего рисунка. Длина в долях окружности — у дуг, дорожке она не нужна.
 */
const CIRCLES = [
	{ part: 'track', fraction: false },
	{ part: 'range', fraction: true },
	{ part: 'runner', fraction: true },
] as const

export const progressSpinnerTemplate: ITemplate<IProgressSpinner> = {
	create: (root) => {
		const { ownerDocument } = root
		const ring = ownerDocument.createElementNS(SVG, 'svg')

		ring.setAttribute('class', 's-progress-spinner__ring')
		ring.setAttribute('viewBox', '0 0 16 16')
		ring.setAttribute('aria-hidden', 'true')

		for (const { part, fraction } of CIRCLES) {
			const circle = ownerDocument.createElementNS(SVG, 'circle')

			circle.setAttribute('class', `s-progress-spinner__${part}`)
			circle.setAttribute('cx', '8')
			circle.setAttribute('cy', '8')
			circle.setAttribute('r', '7')

			if (fraction) circle.setAttribute('pathLength', '1')

			ring.appendChild(circle)
		}

		root.appendChild(ring)

		// Слотов нет: написанное внутри элемента не выводится
		return {}
	},

	bindings: [],
}
