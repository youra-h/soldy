/**
 * Иконка по роли из реестра — тег для `Icon` (аналог `useIcon` у Vue).
 *
 * Иконка приходит данными (`{ viewBox, body }`), а корень `<svg>` строит
 * адаптер: `Icon` отдаёт тегу пропсами `ref`, класс, стиль и ARIA (контракт
 * тега — в `Icon.tsx`), и все они ложатся на `<svg>`. Без `ref` не придёт
 * `element:ready`, без класса и стиля — размер, без ARIA иконка перестанет быть
 * скрытой от скринридера.
 *
 * `body` — через `dangerouslySetInnerHTML`, а не разбором на узлы: содержимое
 * иконки произвольно — группы, маски, несколько путей. Источник доверенный
 * (пакет из зависимостей), пользовательский ввод сюда не попадает.
 *
 * Роль резолвится на отрисовке, а не при вызове: `setIcons()` может прийти
 * после того, как компонент уже создан.
 *
 * Компонент на роль один на модуль: React сравнивает тип элемента по ссылке, и
 * новая функция на каждом рендере пересоздавала бы `<svg>` — узел, к которому
 * привязаны плагины иконки. Это не хук: вызывается где угодно, в том числе в
 * разметке компонента.
 */

import type { ComponentType, ReactElement, SVGProps } from 'react'
import { getIcon } from '@soldy-ui/setup'

/** Пропсы тега-иконки: всё, что `Icon` кладёт на корень, ложится на `<svg>`. */
export type TRoleIconProps = SVGProps<SVGSVGElement>

const icons = new Map<string, ComponentType<TRoleIconProps>>()

export function roleIcon(role: string): ComponentType<TRoleIconProps> {
	const known = icons.get(role)

	if (known) return known

	function RoleIcon(props: TRoleIconProps): ReactElement {
		const icon = getIcon(role)

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
