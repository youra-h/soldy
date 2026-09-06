<script lang="ts">
	import { Button } from '@soldy/ui-svelte'
	import type { TComponentSize, TComponentVariant } from '@soldy/core'

	type Props = {
		size?: TComponentSize
		variant?: TComponentVariant
		disabled?: boolean
	}

	const { size, variant, disabled }: Props = $props()

	const views = ['filled', 'plain', 'outlined'] as const
</script>

<div class="demo-container">
	<h3 class="demo-title">Views & Children</h3>

	<div class="demo-grid">
		{#each views as view (view)}
			<div class="demo-section">
				<h4 class="demo-section-title">{view}</h4>
				<div class="demo-section-content">
					<Button {size} {variant} {view} text="Default" {disabled} />
					<Button {size} {variant} {view} {disabled}>
						<span>Custom children</span>
					</Button>
				</div>
			</div>
		{/each}
	</div>

	<div class="demo-info">Demonstrating different views with children</div>
</div>
