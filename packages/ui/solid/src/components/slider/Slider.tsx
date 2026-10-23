import type { Accessor, JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import type { TSliderShownMark, TSliderThumb } from '@soldy-ui/core'
import {
	Elevate,
	createPartProps,
	createRootProps,
	fieldText,
	resolveSlot,
	rootTag,
} from '../../adapter'
import { Index, Show } from '../../adapter/runtime/flow'
import { setupSlider } from './setup.component'
import type { SliderProps } from './base.component'

/**
 * Ползунок: ручки на рельсе, заливка и метки; всё — `span`, ползунок кладут в `Label`.
 * Дорожку, ручку и поле плагины ищут только прямыми детьми (`slide/parts.ts`).
 */
export function Slider(props: SliderProps): JSX.Element {
	const binding = setupSlider(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.rootAria, state.dataset],
		forward: binding.forwardProps(),
	}))

	/** Метка; пустую подпись тема прячет по `:empty`. */
	function mark(entry: Accessor<TSliderShownMark>): JSX.Element {
		const dataset = createPartProps(() => entry().dataset)
		const label = resolveSlot(
			() => props.mark,
			() => ({ value: entry().value, label: entry().label }),
		)

		return (
			<span class="so-slider__mark" style={entry().style} {...dataset()}>
				<span class="so-slider__mark-label">{label() ?? entry().label}</span>
			</span>
		)
	}

	/** Подсказка — внутри ручки, едет за ней; под `aria-hidden`: значение объявляет поле. */
	function tooltip(entry: Accessor<TSliderThumb>, index: number): JSX.Element {
		const content = resolveSlot(
			() => props.thumb,
			() => ({ value: entry().value, index }),
		)

		return (
			<span class="so-slider__tooltip" aria-hidden="true">
				{content() ?? entry().value}
			</span>
		)
	}

	/** Ручка с нативным `range`: набор поля ядро отдаёт целиком (`aria` ручки). */
	function thumb(entry: Accessor<TSliderThumb>, index: number): JSX.Element {
		const dataset = createPartProps(() => entry().dataset)
		const aria = createPartProps(() => entry().aria)
		const value = fieldText(() => String(entry().value))

		return (
			<span class="so-slider__thumb" style={entry().style} {...dataset()}>
				<input
					class="so-slider__input"
					type="range"
					min={entry().min}
					max={entry().max}
					step={entry().step}
					name={state.name}
					disabled={state.disabled}
					{...aria()}
					{...value}
				/>
				<Show when={state.tooltipRendered}>{tooltip(entry, index)}</Show>
			</span>
		)
	}

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					{/* Дорожка — ход центров ручек, её мерит плагин; рельс рисует тема. */}
					<span class="so-slider__track">
						<span class="so-slider__range" style={state.rangeStyle} />
						<Show when={(state.shownMarks?.length ?? 0) > 0}>
							<span class="so-slider__marks" aria-hidden="true">
								<Index each={state.shownMarks}>{mark}</Index>
							</span>
						</Show>
						<Index each={state.thumbs}>{thumb}</Index>
					</span>
				</Elevate>
			</Dynamic>
		</Show>
	)
}
