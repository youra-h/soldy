/**
 * Шаблон Icon: в корне только `<svg>` рисунка роли, растянутый на корень и под
 * `aria-hidden` — имя у корня. Роли нет — `<svg>` снят.
 */

import type { IIcon } from '@soldy-ui/core'
import { bind, drawRoleIcon, roleIcon, type ITemplate } from '../../adapter'

/** Рисунок каждого элемента — свой: создаётся с первой ролью и остаётся за элементом. */
const pictures = new WeakMap<HTMLElement, SVGSVGElement>()

/** `<svg>` рисунка элемента — во весь корень и без своего имени. */
function pictureOf(root: HTMLElement, role: string): SVGSVGElement {
	const known = pictures.get(root)

	if (known) return known

	const svg = roleIcon(role)

	svg.setAttribute('width', '100%')
	svg.setAttribute('height', '100%')
	svg.setAttribute('aria-hidden', 'true')
	pictures.set(root, svg)

	return svg
}

export const iconTemplate: ITemplate<IIcon> = {
	// Слотов нет: написанное внутри элемента не выводится
	create: () => ({ slots: {} }),

	bindings: [
		bind('icon', ({ root }) => {
			const role = root.getAttribute('icon')

			if (!role) {
				pictures.get(root)?.remove()

				return
			}

			const svg = pictureOf(root, role)

			drawRoleIcon(svg, role)

			if (svg.parentNode !== root) root.appendChild(svg)
		}),
	],
}
