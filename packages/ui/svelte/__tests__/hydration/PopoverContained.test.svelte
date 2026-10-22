<script lang="ts">
	/**
	 * Страница гидратации: поповер с `contained` — панель в корне, на месте, —
	 * с триггером со связкой из scope и содержимым панели. Расхождений у
	 * сервера и браузера нет — пропсов у страницы нет.
	 */
	import type { DescriptorSlots, PopoverDescriptor } from '@soldy-ui/setup'
	import { Popover } from '@soldy-ui/svelte'

	type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']
</script>

{#snippet trigger({ triggerAria, triggerDataset }: TTriggerScope)}
	<button type="button" class="so-test-trigger" {...triggerAria} {...triggerDataset}
		>Открыть</button
	>
{/snippet}

<Popover contained {trigger}><span class="so-test-content">Панель</span></Popover>
