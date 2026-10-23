<script lang="ts">
	import { getIcon } from '@soldy-ui/setup'
	import type { Attachment } from 'svelte/attachments'
	import type { TRoleIcon } from './icon'
	import type { TRootNodeAttributes } from './root'

	type TRoleIconProps = {
		icon: TRoleIcon
		/** Атрибуты корня `Icon`, разложенные на узел. */
		attributes: TRootNodeAttributes
		/** Привязка корня; нет её — `<svg>` часть компонента (отметка CheckBox). */
		attach?: Attachment<Element>
	}

	const { icon, attributes, attach }: TRoleIconProps = $props()

	// Из реестра на отрисовке: `useIcons()` может прийти после `roleIcon`
	const source = $derived(getIcon(icon.role))
</script>

<!--
	`<svg>` иконки по роли: корень `Icon` с меткой роли в `tag` и отметка
	CheckBox. `body` — доверенный источник из пакета иконок, поэтому `{@html}`.
-->
<svg {...attributes} viewBox={source.viewBox} {@attach attach}>{@html source.body}</svg>
