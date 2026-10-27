<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { RadioGroupItem } from './item'
	import { setupRadioGroup } from './setup.component'
	import type { RadioGroupProps } from './base.component'

	let { ref = $bindable(), ...props }: RadioGroupProps = $props()
	const mountId = $props.id()

	const binding = setupRadioGroup(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<Dynamic
	rendered={state.rendered}
	tag={state.tag}
	attributes={toRootProps(
		state,
		[state.attrs, state.aria, state.dataset],
		binding.forwardProps,
	)}
	attach={binding.attachElement}
>
	{#if props.children}
		{@render props.children()}
	{:else}
		{#each state.shown ?? [] as radio (radio.uid)}
			{#snippet label(scope: { active: boolean })}
				{@render props.item?.({ ...scope, item: radio })}
			{/snippet}
			<RadioGroupItem ctrl={radio} children={props.item ? label : undefined} />
		{/each}
	{/if}
</Dynamic>
