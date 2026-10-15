<script lang="ts" module>
	/** Компонент со своим корнем — каждый, и часть коллекции тоже. */
	export type TRootKind =
		| 'Button'
		| 'ComponentView'
		| 'Frame'
		| 'Icon'
		| 'Label'
		| 'ProgressSpinner'
		| 'Skeleton'
		| 'Input'
		| 'CheckBox'
		| 'Switch'
		| 'Tabs'
		| 'Tabs.Item'
		| 'Tabs.Content'
		| 'Accordion'
		| 'Accordion.Item'
		| 'RadioGroup'
		| 'RadioGroup.Item'
		| 'ListBox'
		| 'ListBox.Item'
</script>

<script lang="ts">
	/**
	 * Тестовая обёртка потребителя: корень компонента он берёт связываемым
	 * пропом — `bind:ref`. Привязка функциями (`bind:ref={get, set}`), чтобы
	 * видеть каждую запись `ref` компонентом, а не только последнее значение:
	 * каждую обёртка отдаёт `onRef`. `shown` снимает компонент, оставляя
	 * обёртку, — так видно, что после снятия `ref` снова `null`.
	 *
	 * Часть коллекции рисуется в своём владельце, панель — в слоте `content`
	 * набора, под активным табом. Frame — показанный: скрытый уходит
	 * телепортом, когда его покажут.
	 */
	import type { TButton } from '@soldy-ui/core'
	import {
		Accordion,
		Button,
		CheckBox,
		ComponentView,
		Frame,
		Icon,
		Input,
		Label,
		ListBox,
		ProgressSpinner,
		RadioGroup,
		Skeleton,
		Switch,
		Tabs,
	} from '@soldy-ui/svelte'

	type THarnessProps = {
		kind: TRootKind
		/** Рисовать ли компонент. */
		shown?: boolean
		/** Экземпляр кнопки снаружи: смена тега — через него. */
		ctrl?: TButton
		/** Каждая запись `ref` компонентом. */
		onRef: (node: Element | null) => void
		/** `element:ready` компонента. */
		onElementReady?: (element: Element) => void
	}

	const { kind, shown = true, ctrl, onRef, onElementReady }: THarnessProps = $props()

	let node: Element | null = null

	const get = () => node
	const set = (value: Element | null | undefined) => {
		node = value ?? null
		onRef(node)
	}
</script>

{#snippet panel()}
	<Tabs.Content value="a" bind:ref={get, set} {onElementReady} />
{/snippet}

{#if shown}
	{#if kind === 'Button'}
		<Button {ctrl} bind:ref={get, set} {onElementReady} />
	{:else if kind === 'ComponentView'}
		<ComponentView bind:ref={get, set} {onElementReady} />
	{:else if kind === 'Frame'}
		<Frame visible bind:ref={get, set} {onElementReady} />
	{:else if kind === 'Icon'}
		<Icon tag="i" bind:ref={get, set} {onElementReady} />
	{:else if kind === 'Label'}
		<Label bind:ref={get, set} {onElementReady} />
	{:else if kind === 'ProgressSpinner'}
		<ProgressSpinner bind:ref={get, set} {onElementReady} />
	{:else if kind === 'Skeleton'}
		<Skeleton bind:ref={get, set} {onElementReady} />
	{:else if kind === 'Input'}
		<Input bind:ref={get, set} {onElementReady} />
	{:else if kind === 'CheckBox'}
		<CheckBox bind:ref={get, set} {onElementReady} />
	{:else if kind === 'Switch'}
		<Switch bind:ref={get, set} {onElementReady} />
	{:else if kind === 'Tabs'}
		<Tabs bind:ref={get, set} {onElementReady} />
	{:else if kind === 'Tabs.Item'}
		<Tabs>
			<Tabs.Item value="a" text="A" active bind:ref={get, set} {onElementReady} />
		</Tabs>
	{:else if kind === 'Tabs.Content'}
		<Tabs content={panel}>
			<Tabs.Item value="a" text="A" active />
		</Tabs>
	{:else if kind === 'Accordion'}
		<Accordion bind:ref={get, set} {onElementReady} />
	{:else if kind === 'Accordion.Item'}
		<Accordion>
			<Accordion.Item value="a" text="A" bind:ref={get, set} {onElementReady} />
		</Accordion>
	{:else if kind === 'RadioGroup'}
		<RadioGroup bind:ref={get, set} {onElementReady} />
	{:else if kind === 'RadioGroup.Item'}
		<RadioGroup>
			<RadioGroup.Item value="a" bind:ref={get, set} {onElementReady} />
		</RadioGroup>
	{:else if kind === 'ListBox'}
		<ListBox bind:ref={get, set} {onElementReady} />
	{:else}
		<ListBox>
			<ListBox.Item value="a" text="A" bind:ref={get, set} {onElementReady} />
		</ListBox>
	{/if}
{/if}
