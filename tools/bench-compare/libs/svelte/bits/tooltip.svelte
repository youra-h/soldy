<script lang="ts">
	import { Tooltip } from 'bits-ui'
</script>

<!--
	The provider belongs to the application root; here it wraps each copy so
	that the other pages of the library do not carry it. The open delay is the
	soldy one (400 ms) instead of Bits' 700 ms: the hover step of the scenario
	waits 450 ms.
-->
<Tooltip.Provider delayDuration={400}>
	<Tooltip.Root>
		<Tooltip.Trigger>Наведи</Tooltip.Trigger>
		<Tooltip.Portal>
			<Tooltip.Content>Короткое пояснение к кнопке</Tooltip.Content>
		</Tooltip.Portal>
	</Tooltip.Root>
</Tooltip.Provider>
