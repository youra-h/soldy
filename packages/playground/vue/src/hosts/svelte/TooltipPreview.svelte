<script lang="ts">
	import type { DescriptorSlots, TooltipDescriptor } from '@soldy-ui/setup'
	import { Button, Tooltip } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	type TTriggerScope = DescriptorSlots<typeof TooltipDescriptor>['trigger']

	const bind: TPreviewProps = $props()
</script>

<!--
	Триггер — Button, ссылку на панель (`aria-describedby`) он берёт из scope
	сниппета `trigger`. Текст подсказки — содержимым: пропа текста у неё нет.
-->
<Tooltip {...bind}>
	{#snippet trigger({ triggerAria }: TTriggerScope)}
		<Button text="Наведи" {...triggerAria} />
	{/snippet}
	Короткое пояснение к кнопке
</Tooltip>
