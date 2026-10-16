/**
 * Шаблон Icon.
 *
 * Корень — сам `<span is="so-icon">`: классы (`so-icon`, `--size-*`), наборы
 * (`aria-hidden`, а с именем — `role="img"` и `aria-label`) и размер — стиль
 * от плагина раскладки (`layout_styles`) — раскладывает на него база
 * (`SoldyElement`). Здесь только рисунок роли.
 *
 * Роль — свой атрибут элемента (`icon`): значение хранит он сам, и привязка
 * читает роль из атрибута корня. Роль есть — в корне `<svg>` с рисунком роли
 * (`roleIcon`), растянутый на корень атрибутами `width` и `height="100%"`: для
 * темы корень `span` — то же, что корень `svg` в других адаптерах, и о
 * вложенном `<svg>` ей знать не нужно. Сменилась роль — новый рисунок на том
 * же узле (`drawRoleIcon`): узел у элемента один на всё время жизни. Роли нет
 * (атрибут снят или пуст) — `<svg>` снят, и корень пуст, как `<Icon>` без
 * тега в других адаптерах.
 *
 * Рисунок — под `aria-hidden`: имя иконки — у корня, как у кольца
 * ProgressSpinner.
 *
 * Слотов нет, как у Icon в описании: написанное внутри элемента не выводится.
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
	create: () => ({}),

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
