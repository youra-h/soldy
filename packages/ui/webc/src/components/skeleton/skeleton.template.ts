/**
 * Шаблон Skeleton: заглушка — первым узлом перед содержимым и только пока
 * показана (`present`). `aria-hidden` — на ней, а не на корне: в корне
 * содержимое.
 */

import type { ISkeleton } from '@soldy-ui/core'
import { bind, type ITemplate } from '../../adapter'

/** Заглушка элемента — один узел на всё время жизни: привязка вставляет и вынимает его. */
const placeholders = new WeakMap<HTMLElement, HTMLElement>()

export const skeletonTemplate: ITemplate<ISkeleton> = {
	create: (root) => {
		const placeholder = root.ownerDocument.createElement('div')

		placeholder.className = 'so-skeleton__placeholder'
		placeholder.setAttribute('aria-hidden', 'true')
		placeholders.set(root, placeholder)

		return { slots: { default: { mode: 'append', node: root } } }
	},

	bindings: [
		bind('present', ({ root, state }) => {
			const placeholder = placeholders.get(root)

			if (!placeholder) return

			if (!state.present) {
				placeholder.remove()
			} else if (root.firstChild !== placeholder) {
				root.prepend(placeholder)
			}
		}),
	],
}
