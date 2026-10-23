/**
 * Иконка по роли — тег для `Icon`, аналог `roleIcon` у Vue. Атрибуты корня и
 * `ref` ложатся на `<svg>`, тело иконки — `innerHTML` из доверенного пакета.
 * Роль резолвится на отрисовке: `useIcons()` может прийти позже. Компонент на
 * роль один, и `tag` с той же ролью корень не пересоздаёт.
 */

import type { Component, JSX } from 'solid-js'
import { getIcon } from '@soldy-ui/setup'

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
