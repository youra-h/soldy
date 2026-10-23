<script lang="ts">
	import { Dynamic, toRootProps, toStyleText } from '../../adapter'
	import { setupSlider } from './setup.component'
	import type { SliderProps } from './base.component'

	let { ref = $bindable(), ...props }: SliderProps = $props()
	const mountId = $props.id()

	const binding = setupSlider(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	Slider — корень и всё внутри — `span`: ползунок кладут в `Label`, а внутри `label`
	разрешена только строчная разметка. Атрибуты потребителя — корню: полей столько,
	сколько ручек. Стиль — строкой (`toStyleText`): чужого на этих узлах нет. Петля
	ручек — по месту: своей идентичности у ручки нет.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.attrs, state.rootAria, state.dataset],
			binding.forwardProps,
		)}
		attach={binding.attachElement}
	>
		<span class="so-slider__track">
			<span class="so-slider__range" style={toStyleText(state.rangeStyle)}></span>
			{#if state.shownMarks && state.shownMarks.length > 0}
				<span class="so-slider__marks" aria-hidden="true">
					{#each state.shownMarks as mark, index (index)}
						<span class="so-slider__mark" style={toStyleText(mark.style)} {...mark.dataset}>
							<!-- Края подписи Svelte срезает: пустую тема прячет по `:empty`. -->
							<span class="so-slider__mark-label">
								{#if props.mark}
									{@render props.mark({ value: mark.value, label: mark.label })}
								{:else}
									{mark.label}
								{/if}
							</span>
						</span>
					{/each}
				</span>
			{/if}
			{#each state.thumbs ?? [] as thumb, index}
				<span class="so-slider__thumb" style={toStyleText(thumb.style)} {...thumb.dataset}>
					<input
						class="so-slider__input"
						type="range"
						min={thumb.min}
						max={thumb.max}
						step={thumb.step}
						value={thumb.value}
						name={state.name}
						disabled={state.disabled}
						{...thumb.aria}
					/>
					{#if state.tooltipRendered}
						<span class="so-slider__tooltip" aria-hidden="true">
							{#if props.thumb}
								{@render props.thumb({ value: thumb.value, index })}
							{:else}
								{thumb.value}
							{/if}
						</span>
					{/if}
				</span>
			{/each}
		</span>
	</Dynamic>
{/if}
