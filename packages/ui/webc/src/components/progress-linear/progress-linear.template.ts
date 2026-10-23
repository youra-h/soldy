/**
 * Шаблон ProgressLinear: корень — дорожка, внутри только заливка; бег тема
 * рисует псевдоэлементом корня. Текста нет: содержимое `progressbar` скринридер
 * не читает.
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
