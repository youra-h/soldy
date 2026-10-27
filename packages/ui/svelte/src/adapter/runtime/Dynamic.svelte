<script lang="ts">
	import { untrack, type Snippet } from 'svelte'
	import { createAttachmentKey, type Attachment } from 'svelte/attachments'
	import { TRoleIcon } from '../common/icon'
	import RoleIcon from '../common/RoleIcon.svelte'
	import type { TRootAttributes } from '../common/root'
	import { rootStyle, toNodeAttributes } from './root-style.svelte'
	import { isTagComponent } from './tag'

	type TDynamicProps = {
		/**
		 * Whether the root is mounted — `state.rendered` of the component. A root
		 * that a block of the template already mounts by its own condition (inside
		 * Teleport, the window of Table) passes `true`.
		 */
		rendered: boolean | undefined
		/** Name of an element, a Svelte component or a role icon mark (`roleIcon`). */
		tag: string | object | undefined
		/** Attributes of the root — `toRootProps` of the component. */
		attributes: TRootAttributes
		/** `binding.attachElement`; the wrapper of a root takes `consumerRef`, the root in it — `bindRef`. */
		attach: Attachment<Element>
		/**
		 * The markup of the component inside `<Dynamic>`: fixed for the instance,
		 * it is read once.
		 */
		children?: Snippet
	}

	const { rendered, tag, attributes, attach, children }: TDynamicProps = $props()

	// One per component: a new one on the same node would take other properties for its own
	const style = { [createAttachmentKey()]: rootStyle(() => attributes.style) }
	const node = $derived(toNodeAttributes(attributes, style))

	// Svelte compiles the markup inside `<Dynamic>` to one function of the
	// parent instance; read once, it is rendered by a call, not by a block
	const content = untrack(() => children)
</script>

<!--
	The root by `tag`, like `<component :is>` of Vue: `<svelte:element>` takes only a string, so
	there are three branches. A component from `tag` has to put the attributes and attachments on
	its root (`TTagComponent`). `rendered` is a condition of the same branches: one block per root,
	not a block of every template around it.
-->
{#if rendered && typeof tag === 'string'}
	<svelte:element this={tag} {...node} {@attach attach}>{@render content?.()}</svelte:element>
{:else if rendered && tag instanceof TRoleIcon}
	<RoleIcon icon={tag} attributes={node} {attach} />
{:else if rendered && isTagComponent(tag)}
	{@const Tag = tag}
	<Tag {...node} {@attach attach}>{@render content?.()}</Tag>
{/if}
