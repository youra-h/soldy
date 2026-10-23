<script lang="ts">
	import { Dynamic, RoleIcon, roleIcon, toRootProps, toStyleText } from '../../adapter'
	import { setupRating } from './setup.component'
	import type { RatingProps } from './base.component'

	let { ref = $bindable(), ...props }: RatingProps = $props()
	const mountId = $props.id()

	const binding = setupRating(() => props, mountId, (node) => (ref = node))
	const state = binding.state

	// `<svg>` роли (`RoleIcon`), а не Icon: иконок по две на звезду, а оценок в списке — десятки
	const STAR = roleIcon('star')
	const ICON = { class: 'so-rating__icon' }
</script>

<!--
	Rating — корень и всё внутри — `span`: оценку кладут в `Label`, где разрешена только
	строчная разметка. Атрибуты потребителя — корню: поле указатель не ловит. Ячейки звёзд
	равные и встык: долю дорожки переводят в значение, не зная о звёздах. Ручку и поле
	плагины находят по классам и только прямыми детьми.
-->
{#snippet glyph(value: number, filled: boolean)}
	{#if props.icon}
		{@render props.icon({ value, filled })}
	{:else}
		<RoleIcon icon={STAR} attributes={ICON} />
	{/if}
{/snippet}

{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(state, [state.attrs, state.dataset], binding.forwardProps)}
		attach={binding.attachElement}
	>
		<span class="so-rating__track">
			{#each state.stars ?? [] as star (star.value)}
				<span class="so-rating__star" style={toStyleText(star.style)} aria-hidden="true">
					{@render glyph(star.value, false)}
					<span class="so-rating__star-fill">{@render glyph(star.value, true)}</span>
				</span>
			{/each}
			<span class="so-rating__thumb">
				<input
					class="so-rating__input"
					type="range"
					min="0"
					max={state.max}
					step={state.step}
					value={state.value}
					id={state.id}
					name={state.name}
					disabled={state.disabled}
					{...state.aria}
				/>
			</span>
		</span>
	</Dynamic>
{/if}
