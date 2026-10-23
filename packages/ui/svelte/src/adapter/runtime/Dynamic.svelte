<script lang="ts">
	import type { Snippet } from 'svelte'
	import { createAttachmentKey, type Attachment } from 'svelte/attachments'
	import { TRoleIcon } from '../common/icon'
	import RoleIcon from '../common/RoleIcon.svelte'
	import type { TRootAttributes } from '../common/root'
	import { rootStyle, toNodeAttributes } from './root-style.svelte'
	import { isTagComponent } from './tag'

	type TDynamicProps = {
		/** Имя элемента, компонент Svelte или метка иконки по роли (`roleIcon`). */
		tag: string | object | undefined
		/** Атрибуты корня — `toRootProps` компонента. */
		attributes: TRootAttributes
		/** `binding.attachElement`; у обёртки корня — `consumerRef`, у корня в ней — `bindRef`. */
		attach: Attachment<Element>
		children?: Snippet
	}

	const { tag, attributes, attach, children }: TDynamicProps = $props()

	// Один на компонент: новый на том же узле принял бы чужие свойства за свои
	const style = { [createAttachmentKey()]: rootStyle(() => attributes.style) }
	const node = $derived(toNodeAttributes(attributes, style))
</script>

<!--
	Корень по `tag`, как `<component :is>` у Vue: `<svelte:element>` берёт только
	строку, поэтому ветки три. Компонент из `tag` обязан положить атрибуты и
	attachment-ы на свой корень (`TTagComponent`).
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
