<script lang="ts">
	import { Label, Switch } from 'bits-ui'

	/** The label names the control by `for`, as the soldy `Label` around the switch. */
	const id = $props.id()
</script>

<div>
	<Switch.Root id="{id}-control">
		<Switch.Thumb />
	</Switch.Root>
	<Label.Root for="{id}-control">Включено</Label.Root>
</div>
