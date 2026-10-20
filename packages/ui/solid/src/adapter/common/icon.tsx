/**
 * Иконка по роли из реестра — тег для `Icon` (аналог `roleIcon` у Vue и
 * React).
 *
 * Иконка приходит данными (`{ viewBox, body }`), а корень `<svg>` строит
 * адаптер: `Icon` отдаёт тегу пропсами атрибуты корня — класс, стиль размера,
 * ARIA — и `ref` адаптера, и все они ложатся на `<svg>`. Без `ref` не придёт
 * `element:ready`, без класса и стиля — размер, без ARIA иконка перестанет быть
 * скрытой от скринридера.
 *
 * `body` — через `innerHTML`, а не разбором на узлы: содержимое иконки
 * произвольно — группы, маски, несколько путей. Источник доверенный (пакет из
 * зависимостей), пользовательский ввод сюда не попадает. Узел — `<svg>`, и
 * разметку иконки документ разбирает в пространстве имён SVG.
 *
 * Роль резолвится на отрисовке, в теле компонента, а не при вызове
 * `roleIcon`: `useIcons()` может прийти после того, как тег уже взяли.
 *
 * Компонент на роль один на модуль: `tag` с той же ролью — то же значение, и
 * свойство инстанса не меняется от повторного вызова, а корень не
 * пересоздаётся. Это не хук: зовётся где угодно, в том числе в разметке
 * компонента.
 */

import type { Component, JSX } from 'solid-js'
import { getIcon } from '@soldy-ui/setup'

/** Пропсы тега-иконки: всё, что `Icon` кладёт на корень, ложится на `<svg>`. */
export type TRoleIconProps = JSX.SvgSVGAttributes<SVGSVGElement>

const icons = new Map<string, Component<TRoleIconProps>>()

export function roleIcon(role: string): Component<TRoleIconProps> {
	const known = icons.get(role)

	if (known) return known

	function RoleIcon(props: TRoleIconProps): JSX.Element {
		const icon = getIcon(role)

		return <svg {...props} viewBox={icon.viewBox} innerHTML={icon.body} />
	}

	icons.set(role, RoleIcon)

	return RoleIcon
}
