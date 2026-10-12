<script lang="ts">
	/**
	 * Тестовая обёртка: где стоит элемент списка относительно списков — лифт
	 * Svelte держится на контексте компонента (`setContext` списка).
	 *
	 * - `outside` — элемент вне списка, рядом список со своим элементом;
	 * - `siblings` — два списка рядом, у каждого свои элементы;
	 * - `nested` — список в слоте элемента другого списка.
	 *
	 * Движок первого списка тест получает в `onFirst`, второго — в `onSecond`.
	 */
	import { ListBox, type ListBoxProps } from '@soldy-ui/svelte'

	type TEngineProbe = NonNullable<ListBoxProps['onEngineCreate']>

	type THarnessProps = {
		case: 'outside' | 'siblings' | 'nested'
		onFirst?: TEngineProbe
		onSecond?: TEngineProbe
	}

	const props: THarnessProps = $props()
</script>

{#snippet inner()}
	<ListBox onEngineCreate={props.onSecond}>
		<ListBox.Item value="x" text="X" />
		<ListBox.Item value="y" text="Y" />
	</ListBox>
{/snippet}

{#if props.case === 'outside'}
	<div>
		<ListBox.Item value="z" text="Z" />
		<ListBox onEngineCreate={props.onFirst}>
			<ListBox.Item value="a" text="A" />
		</ListBox>
	</div>
{:else if props.case === 'siblings'}
	<div>
		<ListBox onEngineCreate={props.onFirst}>
			<ListBox.Item value="a" text="A" />
			<ListBox.Item value="b" text="B" />
		</ListBox>
		<ListBox onEngineCreate={props.onSecond}>
			<ListBox.Item value="x" text="X" />
			<ListBox.Item value="y" text="Y" />
			<ListBox.Item value="z" text="Z" />
		</ListBox>
	</div>
{:else}
	<ListBox onEngineCreate={props.onFirst}>
		<ListBox.Item value="a" text="A" trailing={inner} />
		<ListBox.Item value="b" text="B" />
	</ListBox>
{/if}
