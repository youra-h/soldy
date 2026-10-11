<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { Attachment } from 'svelte/attachments'
	import { TRoleIcon } from '../common/icon'
	import RoleIcon from '../common/RoleIcon.svelte'
	import type { TRootAttributes } from '../common/root'
	import { isTagComponent } from './tag'

	type TDynamicProps = {
		/** Корень: имя элемента, компонент Svelte или метка иконки по роли (`roleIcon`). */
		tag: string | object | undefined
		/** Атрибуты корня — `toRootProps` компонента. */
		attributes: TRootAttributes
		/** Привязка корня к `TElementPlugin` компонента — `binding.attachElement`. */
		attach: Attachment<Element>
		children?: Snippet
	}

	const { tag, attributes, attach, children }: TDynamicProps = $props()
</script>

<!--
	Dynamic — корень компонента по `tag`, как `<component :is="tag">` у Vue.

	Ядро разрешает `tag` строкой или объектом, а `<svelte:element>` берёт только
	строку. Поэтому ветки три:

	- строка — элемент с этим именем;
	- метка роли (`roleIcon`) — `<svg>` иконки этой роли (`RoleIcon`);
	- компонент Svelte — сам компонент: атрибуты и привязку (attachment) он
	  получает пропсами и обязан положить их на свой корень, как компонент в
	  `tag` у React. Без привязки не придёт `element:ready`, без класса и стиля
	  — вид, без ARIA — доступность.

	Другого объекта Svelte нарисовать не может, и корня у такого компонента
	нет. Атрибуты и привязка — на узел, содержимое — `children`. Смена тега
	пересоздаёт узел, а привязка отвязывает прежний и привязывает новый.
-->
{#if typeof tag === 'string'}
	<svelte:element this={tag} {...attributes} {@attach attach}>
		{@render children?.()}
	</svelte:element>
{:else if tag instanceof TRoleIcon}
	<RoleIcon icon={tag} {attributes} {attach} />
{:else if isTagComponent(tag)}
	{@const Tag = tag}
	<Tag {...attributes} {@attach attach}>{@render children?.()}</Tag>
{/if}
