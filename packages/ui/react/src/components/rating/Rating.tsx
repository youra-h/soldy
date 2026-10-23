import type { ElementType, ReactElement } from 'react'
import {
	NativeInput,
	elevated,
	renderSlot,
	roleIcon,
	toAriaProps,
	toReactStyle,
	toRootProps,
} from '../../adapter'
import { useSetupRating } from './setup.component'
import type { RatingProps } from './base.component'

/** Звезда — `svg` роли, а не `Icon`: иконок по две на звезду, оценок в списке — десятки. */
const Star = roleIcon('star')

/** Rating — оценка звёздами: docs/agents/patterns.md, «Готовые паттерны». */
export function Rating(props: RatingProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupRating(props)

	const { rendered, tag, attrs, aria, dataset, stars, max, step, value, id, name, disabled } =
		state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, dataset], forwardProps)}>
			<span className="so-rating__track">
				{stars?.map((star) => (
					<span
						key={star.value}
						className="so-rating__star"
						style={toReactStyle(star.style)}
						aria-hidden="true"
					>
						{elevated(
							layer,
							renderSlot(props.icon, { value: star.value, filled: false }),
						) ?? <Star className="so-rating__icon" />}
						<span className="so-rating__star-fill">
							{elevated(
								layer,
								renderSlot(props.icon, { value: star.value, filled: true }),
							) ?? <Star className="so-rating__icon" />}
						</span>
					</span>
				))}
				<span className="so-rating__thumb">
					<NativeInput
						className="so-rating__input"
						type="range"
						min="0"
						max={max}
						step={step}
						id={id}
						name={name}
						disabled={disabled}
						{...toAriaProps(aria)}
						live={{ value }}
					/>
				</span>
			</span>
		</Tag>
	)
}
