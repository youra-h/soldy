<script lang="ts">
	import { TButton } from '@soldy/core'
	import PlaygroundLayout from '../layouts/PlaygroundLayout.svelte'
	import Properties from '../common/Properties.svelte'
	import type { TPropertiesSchema } from '../common/Properties.svelte'
	import PropsDemo from '../components/button/Component.svelte'
	import InstanceDemo from '../components/button/Instance.svelte'
	import SlotsDemo from '../components/button/Slots.svelte'
	import { SIZES, VARIANTS, BUTTON_APPEARANCES } from '../common/items'
	import type { EventLogEntry } from '../common/EventLog.svelte'

	const { onLog }: { onLog: (entry: EventLogEntry) => void } = $props()

	const schema: TPropertiesSchema = {
		visible: { type: 'boolean', default: true },
		rendered: { type: 'boolean', default: true },
		disabled: { type: 'boolean', default: false },
		size: { type: 'select', default: 'normal', options: SIZES },
		variant: { type: 'select', default: 'normal', options: VARIANTS },
		view: { type: 'select', default: 'filled', options: BUTTON_APPEARANCES },
		text: { type: 'string', default: 'Button', placeholder: 'Button text' },
	}

	let componentProps = $state<Record<string, any>>({
		visible: true,
		rendered: true,
		disabled: false,
		size: 'normal',
		variant: 'normal',
		view: 'filled',
		text: 'Button',
	})

	/**
	 * Инстанс создаётся здесь, а не внутри Instance.svelte: тогда кнопки
	 * Show/Hide из панели свойств просто дёргают его методы, без проброса
	 * ref-ов наружу (в React для этого понадобился useImperativeHandle).
	 */
	const instance = new TButton({
		rendered: true,
		visible: true,
		size: 'normal',
		variant: 'normal',
		view: 'filled',
		disabled: false,
		text: 'Button',
	})
</script>

<PlaygroundLayout title="Button Playground">
	{#snippet properties()}
		<Properties
			value={componentProps}
			{schema}
			onChange={(next) => (componentProps = next)}
			onShow={() => instance.show()}
			onHide={() => instance.hide()}
		/>
	{/snippet}

	{#snippet propsDemo()}
		<PropsDemo {...componentProps} {onLog} />
	{/snippet}

	{#snippet instanceDemo()}
		<InstanceDemo {instance} {...componentProps} {onLog} />
	{/snippet}

	{#snippet slotsDemo()}
		<SlotsDemo
			size={componentProps.size}
			variant={componentProps.variant}
			disabled={componentProps.disabled}
		/>
	{/snippet}
</PlaygroundLayout>
