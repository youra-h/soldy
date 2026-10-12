/**
 * Шаблон Skeleton.
 *
 * Корень — сам `<div is="so-skeleton">`: классы, наборы и размер — стиль от
 * плагина раскладки (`layout_styles`) — раскладывает на него база
 * (`SoldyElement`). Пока заглушка показана, ядро помечает корень `aria-busy`.
 *
 * Корень есть всегда: в нём лежит настоящее содержимое (слот `default`), а
 * `rendered` и `visible` решают только, показана ли заглушка (`present`).
 * Поэтому видимость корень не прячет — это говорит базе описание корня
 * элемента (`hides: false`).
 *
 * Заглушка декоративна: она изображает будущий текст, а не является им.
 * `aria-hidden` стоит на ней, а не на корне — в корне лежит содержимое, и
 * скрывать его нельзя. Стоит она первым узлом, перед содержимым, и есть в
 * корне, только пока показана, — как `v-if` во Vue.
 */

import type { ISkeleton } from '@soldy-ui/core'
import { bind, type ITemplate } from '../../adapter'

/**
 * Заглушка каждого элемента — своя, одна на всё время жизни: структура
 * строится при первом подключении, а привязка вставляет и вынимает тот же
 * узел.
 */
const placeholders = new WeakMap<HTMLElement, HTMLElement>()

export const skeletonTemplate: ITemplate<ISkeleton> = {
	create: (root) => {
		const placeholder = root.ownerDocument.createElement('div')

		placeholder.className = 's-skeleton__placeholder'
		placeholder.setAttribute('aria-hidden', 'true')
		placeholders.set(root, placeholder)

		return { default: { mode: 'append', node: root } }
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
