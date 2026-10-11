<script lang="ts">
	import { getIcon } from '@soldy-ui/setup'
	import type { Attachment } from 'svelte/attachments'
	import type { TRoleIcon } from './icon'
	import type { TRootNodeAttributes } from './root'

	type TRoleIconProps = {
		/** Метка роли из `roleIcon`. */
		icon: TRoleIcon
		/** Атрибуты корня иконки — `toRootProps` компонента, разложенные на узел. */
		attributes: TRootNodeAttributes
		/** Привязка корня к `TElementPlugin` компонента. */
		attach: Attachment<Element>
	}

	const { icon, attributes, attach }: TRoleIconProps = $props()

	// Роль — из реестра на отрисовке, а не при вызове `roleIcon`: `setIcons()`
	// может прийти после того, как метку уже взяли
	const source = $derived(getIcon(icon.role))
</script>

<!--
	RoleIcon — `<svg>` иконки по роли (`roleIcon`): корень `Icon`, когда его
	`tag` — метка роли.

	Иконка приходит данными (`{ viewBox, body }`), а корень `<svg>` строит
	адаптер: атрибуты корня `Icon` — классы, стиль размера, ARIA — и привязка к
	`TElementPlugin` ложатся на `<svg>`. Без привязки не придёт `element:ready`,
	без класса и стиля — размер, без ARIA иконка перестанет быть скрытой от
	скринридера. Стиль в браузере ставит attachment из тех же атрибутов
	(`Dynamic`).

	`body` — через `{@html}`, а не разбором на узлы: содержимое иконки
	произвольно — группы, маски, несколько путей. Источник доверенный (пакет из
	зависимостей), пользовательский ввод сюда не попадает.
-->
<svg {...attributes} viewBox={source.viewBox} {@attach attach}>{@html source.body}</svg>
