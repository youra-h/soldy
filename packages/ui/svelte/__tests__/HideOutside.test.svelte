<script lang="ts">
	/**
	 * Тестовая обёртка: страница и модальный слой с поповером внутри. Модальным
	 * слоем служит `Frame`, которому плагин немого фона поставлен снаружи, из
	 * `onBundleCreate`, с открытостью по `visible` — так, как его поставит
	 * модальное окно. Открытость слоя — `shown`.
	 */
	import { THideOutsidePlugin, TPluginBundle } from '@soldy-ui/plugins'
	import type { DescriptorSlots, PopoverDescriptor } from '@soldy-ui/setup'
	import { Button, Frame, Popover } from '@soldy-ui/svelte'

	type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

	type THarnessProps = {
		shown?: boolean
	}

	const props: THarnessProps = $props()

	/** Плагин ставится так, как его поставит модальное окно: открытость — `visible`. */
	const hideOutside = (bundle: unknown) => {
		if (bundle instanceof TPluginBundle) bundle.use(THideOutsidePlugin, { property: 'visible' })
	}
</script>

{#snippet trigger({ triggerAria, triggerDataset }: TTriggerScope)}
	<Button text="Ещё" class="so-test-trigger" {...triggerAria} {...triggerDataset} />
{/snippet}

<div>
	<button class="so-test-page">Страница</button>
	<Frame class="so-test-dialog" visible={props.shown ?? false} onBundleCreate={hideOutside}>
		<Popover {trigger}>
			<button class="so-test-inside">Внутри</button>
		</Popover>
	</Frame>
</div>
