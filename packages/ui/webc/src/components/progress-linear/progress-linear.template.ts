/**
 * Шаблон ProgressLinear.
 *
 * Корень — сам `<span is="so-progress-linear">` и есть дорожка во всю длину:
 * классы (размер, вариант и ось — `--size-*`, `--variant-*`, `--horizontal`
 * или `--vertical`), наборы (роль, значения и имя для скринридера, бег
 * `data-indeterminate`, `dir`) и долю готового — переменную
 * `--so-progress-linear-percent` стиль-выхода `percentStyle` —
 * раскладывает на него база (`ElementBase`). Здесь только заливка, как у
 * Vue: состав и имя класса, без привязок.
 *
 * Заливка — доля готового от начала строки, в RTL — справа, у вертикальной
 * полосы — снизу; длину она берёт из переменной на корне. Пока полоса бежит,
 * заливку тема прячет, а бег рисует псевдоэлементом корня: своего узла у
 * бегущего отрезка нет. Строчная, `span`: полосу кладут в Button и Label.
 *
 * Текста и слотов нет: содержимое узла с ролью `progressbar` скринридер не
 * читает, а в тонкую полосу текст не влезет. Подпись и число потребитель
 * ставит рядом своей разметкой, а написанное внутри элемента не выводится.
 */

import type { IProgressLinear } from '@soldy-ui/core'
import type { ITemplate } from '../../adapter'

export const progressLinearTemplate: ITemplate<IProgressLinear> = {
	create: (root) => {
		const range = root.ownerDocument.createElement('span')

		range.className = 'so-progress-linear__range'
		root.appendChild(range)

		// Слотов нет: написанное внутри элемента не выводится
		return { slots: {} }
	},

	bindings: [],
}
