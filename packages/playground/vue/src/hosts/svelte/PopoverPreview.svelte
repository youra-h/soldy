<script lang="ts">
	import type { DescriptorSlots, PopoverDescriptor } from '@soldy-ui/setup'
	import { Button, Popover } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

	const bind: TPreviewProps = $props()
</script>

<!--
	Триггер — Button, связку с панелью и вид «нажат» он берёт из scope сниппета
	`trigger`. В содержимом есть кнопка: на неё при открытии уходит фокус.
-->
<Popover {...bind}>
	{#snippet trigger({ triggerAria, triggerDataset }: TTriggerScope)}
		<Button text="Открыть" {...triggerAria} {...triggerDataset} />
	{/snippet}
	<p style="margin: 0 0 8px">Произвольное содержимое: текст, поля, кнопки</p>
	<Button text="Действие" />
</Popover>
