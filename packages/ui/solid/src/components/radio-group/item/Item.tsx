import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import {
	chainHandler,
	createPartProps,
	createRootProps,
	resolveSlot,
	rootTag,
	toControlAttrs,
	toRootForward,
} from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { setupRadioGroupItem } from './setup.component'
import type { RadioGroupItemAttributes, RadioGroupItemProps } from './base.component'

/**
 * Радио: корень — `label`, внутри нативный `<input type="radio">`, кольцо и подпись.
 * Поле стоит перед кольцом: кольцо фокуса тема рисует соседним селектором от него.
 */
export function RadioGroupItem(props: RadioGroupItemProps): JSX.Element {
	const binding = setupRadioGroupItem(props)
	const state = binding.state
	const context = binding.context
	// Без `order` — AGENTS.md (Solid), «Раскладка корня»
	const root = createRootProps(() => ({
		state: { classes: state.classes, visible: state.visible },
		sets: [state.dataset, state.attrs],
		forward: toRootForward(binding.forwardProps()),
	}))
	const label = resolveSlot(
		() => props.children,
		() => ({ active: state.active ?? false }),
	)

	const aria = createPartProps(() => state.aria)
	/** Атрибуты поля — всё от потребителя, кроме класса и стиля; `change` — сначала выбор. */
	const control = createPartProps(() => {
		const { onChange, ...attributes } = toControlAttrs<RadioGroupItemAttributes>(
			binding.forwardProps(),
		)
		const choose = () => {
			if (context) context.adapters.activation.active = true
		}

		return { ...attributes, onChange: chainHandler(choose, onChange) }
	})

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<input
					class="so-radio-group-item__input"
					type="radio"
					name={state.name}
					value={state.value}
					disabled={state.disabled}
					{...aria()}
					{...control()}
					checked={state.active}
				/>
				<span class="so-radio-group-item__control">
					<span class="so-radio-group-item__indicator" />
				</span>
				<span class="so-radio-group-item__text">{label()}</span>
			</Dynamic>
		</Show>
	)
}
