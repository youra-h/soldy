/**
 * Иконка по роли из реестра — тег для `Icon` (аналог `roleIcon` у Vue): всё,
 * что `Icon` кладёт на корень, ложится на `<svg>`. Компонент на роль один на
 * модуль — новый тип на каждом рендере пересоздавал бы узел; роль резолвится
 * на отрисовке — `useIcons()` может прийти позже.
 */

import type { ComponentType, ReactElement, SVGProps } from 'react'
import { getIcon } from '@soldy-ui/setup'

export type TRoleIconProps = SVGProps<SVGSVGElement>

const icons = new Map<string, ComponentType<TRoleIconProps>>()

export function roleIcon(role: string): ComponentType<TRoleIconProps> {
	const known = icons.get(role)

	if (known) return known

	function RoleIcon(props: TRoleIconProps): ReactElement {
		const icon = getIcon(role)

		// Содержимое иконки произвольно, источник доверенный — пакет иконок
		return (
			<svg
				{...props}
				viewBox={icon.viewBox}
				dangerouslySetInnerHTML={{ __html: icon.body }}
			/>
		)
	}

	RoleIcon.displayName = `Icon_${role}`
	icons.set(role, RoleIcon)

	return RoleIcon
}
