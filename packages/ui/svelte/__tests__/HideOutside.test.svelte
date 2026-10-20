<script lang="ts">
	/**
	 * Тестовая обёртка: страница и модальный слой с поповером или Select
	 * внутри (`inside`). Модальным слоем служит `Frame`, которому плагин немого
	 * фона поставлен снаружи, из `onBundleCreate`, с открытостью по `visible` —
	 * так, как его поставит модальное окно. Открытость слоя — `shown`.
	 */
	import { THideOutsidePlugin, TPluginBundle } from '@soldy-ui/plugins'
	import type { DescriptorSlots, PopoverDescriptor } from '@soldy-ui/setup'
	import { Button, Frame, Popover, Select } from '@soldy-ui/svelte'

	type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

	type THarnessProps = {
		shown?: boolean
		/** Что внутри слоя. */
		inside?: 'popover' | 'select'
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
		{#if props.inside === 'select'}
			<Select class="so-test-select">
				<Select.Item value="a" text="Первый" />
				<Select.Item value="b" text="Второй" />
			</Select>
		{:else}
			<Popover {trigger}>
				<button class="so-test-inside">Внутри</button>
			</Popover>
		{/if}
	</Frame>
</div>
