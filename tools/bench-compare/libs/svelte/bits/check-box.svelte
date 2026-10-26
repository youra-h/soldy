<script lang="ts">
	import { Checkbox, Label } from 'bits-ui'

	/** The label names the control by `for`, as the soldy `Label` around the checkbox. */
	const id = $props.id()
</script>

<div>
	<Checkbox.Root id="{id}-control">
		{#snippet children({ checked })}{checked ? '✓' : ''}{/snippet}
	</Checkbox.Root>
	<Label.Root for="{id}-control">Согласен</Label.Root>
</div>
