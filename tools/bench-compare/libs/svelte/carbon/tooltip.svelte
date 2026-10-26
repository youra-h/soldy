<script lang="ts">
	import { TooltipDefinition } from 'carbon-components-svelte'
</script>

<!--
	Carbon Components Svelte has no tooltip around an arbitrary trigger (React
	Carbon's `Tooltip`): `Tooltip` brings its own icon trigger, and
	`TooltipDefinition` — a button trigger opened by hover (with the enter
	delay) and by focus — is the closest to the soldy preview.
-->
<TooltipDefinition tooltipText="Короткое пояснение к кнопке">Наведи</TooltipDefinition>
