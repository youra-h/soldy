/**
 * Рисунок иконки роли на `<svg>`: `viewBox` и содержимое из реестра. Роль
 * резолвится при отрисовке — `useIcons()` может прийти после импорта, — а та
 * же иконка второй раз не пишется. Содержимое — `innerHTML` в пространстве
 * имён SVG; источник доверенный — пакет иконок приложения.
 */

import { getIcon, type TIconSource } from '@soldy-ui/setup'

const SVG = 'http://www.w3.org/2000/svg'

const drawn = new WeakMap<SVGSVGElement, TIconSource>()

export function drawRoleIcon(svg: SVGSVGElement, role: string): void {
	const icon = getIcon(role)

	if (drawn.get(svg) === icon) return

	svg.setAttribute('viewBox', icon.viewBox)
	svg.innerHTML = icon.body
	drawn.set(svg, icon)
}

/** Голый `<svg>` с рисунком роли — для разметки, где иконка не компонент (отметка CheckBox). */
export function roleIcon(role: string): SVGSVGElement {
	const svg = document.createElementNS(SVG, 'svg')

	drawRoleIcon(svg, role)

	return svg
}
