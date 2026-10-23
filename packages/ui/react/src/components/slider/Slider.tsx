import type { ElementType, ReactElement } from 'react'
import {
	NativeInput,
	elevated,
	renderSlot,
	toAriaProps,
	toReactStyle,
	toRootProps,
} from '../../adapter'
import { useSetupSlider } from './setup.component'
import type { SliderProps } from './base.component'

/** Slider — ползунок, ручек одна или несколько: docs/agents/patterns.md, «Готовые паттерны». */
export function Slider(props: SliderProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupSlider(props)

	const {
		rendered,
		tag,
		attrs,
		rootAria,
		dataset,
		name,
		disabled,
		thumbs,
		shownMarks,
		rangeStyle,
		tooltipRendered,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, rootAria, dataset], forwardProps)}>
			<span className="so-slider__track">
				<span className="so-slider__range" style={toReactStyle(rangeStyle)} />

				{shownMarks && shownMarks.length > 0 ? (
					<span className="so-slider__marks" aria-hidden="true">
						{shownMarks.map((mark, index) => (
							<span
								key={index}
								className="so-slider__mark"
								style={toReactStyle(mark.style)}
								{...toAriaProps(mark.dataset)}
							>
								<span className="so-slider__mark-label">
									{elevated(
										layer,
										renderSlot(props.mark, {
											value: mark.value,
											label: mark.label,
										}),
									) ?? mark.label}
								</span>
							</span>
						))}
					</span>
				) : null}

				{thumbs?.map((thumb, index) => (
					<span
						key={index}
						className="so-slider__thumb"
						style={toReactStyle(thumb.style)}
						{...toAriaProps(thumb.dataset)}
					>
						<NativeInput
							className="so-slider__input"
							type="range"
							min={thumb.min}
							max={thumb.max}
							step={thumb.step}
							name={name}
							disabled={disabled}
							{...toAriaProps(thumb.aria)}
							live={{ value: thumb.value }}
						/>
						{tooltipRendered ? (
							<span className="so-slider__tooltip" aria-hidden="true">
								{elevated(
									layer,
									renderSlot(props.thumb, { value: thumb.value, index }),
								) ?? thumb.value}
							</span>
						) : null}
					</span>
				))}
			</span>
		</Tag>
	)
}
