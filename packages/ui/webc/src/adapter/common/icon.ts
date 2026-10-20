/**
 * Иконка по роли из реестра — рисунок на `<svg>` (аналог `roleIcon` у Vue,
 * React, Svelte и Solid и `RoleIconDirective` у Angular).
 *
 * Иконка приходит данными (`{ viewBox, body }`, `useIcons`), а `<svg>` строит
 * адаптер. `drawRoleIcon` кладёт на готовый `<svg>` только рисунок: `viewBox`
 * и содержимое. Класс, размер и ARIA — не его дело: у Icon они на корне,
 * `<span is="so-icon">`, а `<svg>` с рисунком стоит внутри (шаблон Icon).
 * `roleIcon` — голый `<svg>` с рисунком роли: для разметки, где иконка —
 * рисунок, а не компонент (отметка CheckBox), и для приложения.
 *
 * Содержимое — разметкой (`innerHTML`), а не разбором на узлы: содержимое
 * иконки произвольно — группы, маски, несколько путей. Узел — `<svg>`, и
 * разметку документ разбирает в пространстве имён SVG, как `innerHTML` у Vue
 * и Solid. Источник доверенный — пакет иконок из зависимостей приложения,
 * пользовательский ввод сюда не попадает.
 *
 * Роль резолвится при отрисовке, а не при создании модуля: `useIcons()` может
 * прийти после импорта. Узел помнит иконку, которую на нём нарисовали, и та же
 * иконка второй раз не пишется: повторная отрисовка той же роли (полный флаш
 * при перестановке элемента) содержимое не пересобирает, а смена иконки роли в
 * реестре перерисовывает его со следующей отрисовкой.
 */

import { getIcon, type TIconSource } from '@soldy-ui/setup'

/** Пространство имён SVG: в пространстве имён HTML `<svg>` не нарисуется. */
const SVG = 'http://www.w3.org/2000/svg'

/** Иконка, нарисованная на узле: та же — переписывать нечего. */
const drawn = new WeakMap<SVGSVGElement, TIconSource>()

/** Рисунок роли на `<svg>`: `viewBox` и содержимое иконки роли из реестра. */
export function drawRoleIcon(svg: SVGSVGElement, role: string): void {
	const icon = getIcon(role)

	if (drawn.get(svg) === icon) return

	svg.setAttribute('viewBox', icon.viewBox)
	svg.innerHTML = icon.body
	drawn.set(svg, icon)
}

/** Голый `<svg>` в пространстве имён SVG с рисунком роли. */
export function roleIcon(role: string): SVGSVGElement {
	const svg = document.createElementNS(SVG, 'svg')

	drawRoleIcon(svg, role)

	return svg
}
