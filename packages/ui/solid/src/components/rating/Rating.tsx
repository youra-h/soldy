import type { Accessor, JSX } from 'solid-js'
import type { TRatingStar } from '@soldy-ui/core'
import {
	Elevate,
	Root,
	createPartProps,
	createRootProps,
	fieldText,
	resolveSlot,
	roleIcon,
} from '../../adapter'
import { Index, Show } from '../../adapter/runtime/flow'
import { setupRating } from './setup.component'
import type { RatingProps } from './base.component'

/** Значок звезды без слота — иконка роли `star`, компонент на роль один на модуль. */
const STAR = roleIcon('star')

/**
 * Оценка звёздами — ползунок с одной ручкой; всё — `span`, оценку кладут в `Label`.
 * Значок — `svg` роли, а не Icon: иконок по две на звезду, а оценок в списке отзывов десятки.
 */
export function Rating(props: RatingProps): JSX.Element {
	const binding = setupRating(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: binding.forwardProps(),
	}))
	const aria = createPartProps(() => state.aria)
	const value = fieldText(() => (state.value === undefined ? undefined : String(state.value)))

	function icon(star: Accessor<TRatingStar>, filled: boolean): JSX.Element {
		const content = resolveSlot(
			() => props.icon,
			() => ({ value: star().value, filled }),
		)

		return <>{content() ?? <STAR class="so-rating__icon" />}</>
	}

	/** Звезда: пустой слой снизу, залитый — сверху, в обёртке, обрезанной по доле. */
	function star(entry: Accessor<TRatingStar>): JSX.Element {
		return (
			<span class="so-rating__star" style={entry().style} aria-hidden="true">
				{icon(entry, false)}
				<span class="so-rating__star-fill">{icon(entry, true)}</span>
			</span>
		)
	}

	return (
		<Show when={state.rendered}>
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					<span class="so-rating__track">
						<Index each={state.stars}>{star}</Index>
						{/* Ручка — невидимая, во весь ряд: кольцо фокуса тема рисует на ней. */}
						<span class="so-rating__thumb">
							<input
								class="so-rating__input"
								type="range"
								min="0"
								max={state.max}
								step={state.step}
								id={state.id}
								name={state.name}
								disabled={state.disabled}
								{...aria()}
								{...value}
							/>
						</span>
					</span>
				</Elevate>
			</Root>
		</Show>
	)
}
