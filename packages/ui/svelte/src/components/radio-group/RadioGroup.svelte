<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { RadioGroupItem } from './item'
	import { setupRadioGroup } from './setup.component'
	import type { RadioGroupProps } from './base.component'

	let { ref = $bindable(), ...props }: RadioGroupProps = $props()
	const mountId = $props.id()

	const binding = setupRadioGroup(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	RadioGroup — группа радио, «один из N»: корень по `tag` (по умолчанию `div`).

	Корень — контейнер группы. Набор `aria` владельца — на нём, как у Vue:
	`role="radiogroup"` пишет ядро, имя из `aria_label` / `aria_labelledBy` —
	`TAriaPlugin`. Стилей у контейнера в теме нет: радио одной группы стоят где
	угодно внутри — в строках списка, в ячейках таблицы, — и раскладку задаёт
	потребитель.

	Радио — содержимое (`<RadioGroup.Item>`), а без него — `shown` коллекции,
	по `RadioGroupItem` на элемент. Слот подписи статический и получает радио
	через scope (`item`), как у остальных коллекций, — вместе со scope подписи
	самого радио (`active`): проброс — сниппет, который радио зовёт со своим
	scope, и отдаётся он, только когда слот задан группе.

	Радио, смонтированное внутри, входит в коллекцию группы при своей
	инициализации.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.attrs, state.aria, state.dataset],
			binding.forwardProps,
		)}
		attach={binding.attachElement}
	>
		{#if props.children}
			{@render props.children()}
		{:else}
			{#each state.shown ?? [] as radio (radio.uid)}
				{#snippet label(scope: { active: boolean })}
					{@render props.item?.({ ...scope, item: radio })}
				{/snippet}
				<RadioGroupItem ctrl={radio} children={props.item ? label : undefined} />
			{/each}
		{/if}
	</Dynamic>
{/if}
