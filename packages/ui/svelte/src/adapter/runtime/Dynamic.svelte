<script lang="ts">
	import type { Snippet } from 'svelte'
	import { createAttachmentKey, type Attachment } from 'svelte/attachments'
	import { TRoleIcon } from '../common/icon'
	import RoleIcon from '../common/RoleIcon.svelte'
	import type { TRootAttributes } from '../common/root'
	import { rootStyle, toNodeAttributes } from './root-style.svelte'
	import { isTagComponent } from './tag'

	type TDynamicProps = {
		/** Корень: имя элемента, компонент Svelte или метка иконки по роли (`roleIcon`). */
		tag: string | object | undefined
		/** Атрибуты корня — `toRootProps` компонента. */
		attributes: TRootAttributes
		/** Привязка корня к `TElementPlugin` компонента и его `ref` — `binding.attachElement`. */
		attach: Attachment<Element>
		children?: Snippet
	}

	const { tag, attributes, attach, children }: TDynamicProps = $props()

	// Стиль корня: в браузере его ставит attachment по свойствам, на сервере он
	// уходит в атрибуты узла строкой (`toNodeAttributes`). Attachment заводится
	// один раз — новый на том же узле принял бы за свои свойства, которые
	// плагины поставили сами
	const style = { [createAttachmentKey()]: rootStyle(() => attributes.style) }
	const node = $derived(toNodeAttributes(attributes, style))
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

	Стиль корня в браузере — тоже attachment, и едет он в атрибутах узла, как
	attachment-ы потребителя: так он доходит до `<svg>` иконки и до корня
	компонента из `tag` без своего пропа.
-->
{#if typeof tag === 'string'}
	<svelte:element this={tag} {...node} {@attach attach}>
		{@render children?.()}
	</svelte:element>
{:else if tag instanceof TRoleIcon}
	<RoleIcon icon={tag} attributes={node} {attach} />
{:else if isTagComponent(tag)}
	{@const Tag = tag}
	<Tag {...node} {@attach attach}>{@render children?.()}</Tag>
{/if}
