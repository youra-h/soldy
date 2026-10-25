import type { JSX } from 'solid-js'
import {
	Elevate,
	Root,
	createPartProps,
	createRootProps,
	fieldText,
	resolveSlot,
	roleIcon,
	toControlAttrs,
	toRootForward,
} from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { Button } from '../button'
import { Icon } from '../icon'
import { setupNumberInput } from './setup.component'
import type { NumberInputAttributes, NumberInputProps } from './base.component'

/** Глифы кнопок — компоненты на роль: `tag` у Icon — корень, а не роль. */
const CloseGlyph = roleIcon('close')
const MinusGlyph = roleIcon('minus')
const PlusGlyph = roleIcon('plus')

/**
 * Поле числа: ввод, кнопки шага и скрытое поле формы с числом строкой.
 * Кнопка очистки гасит всплытие у самого события (`onActionClick`): `onClick`
 * Solid делегирует документу, а select-only Select открывает панель кликом по корню.
 */
export function NumberInput(props: NumberInputProps): JSX.Element {
	const binding = setupNumberInput(props)
	const state = binding.state
	const ctrl = binding.ctrl
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: toRootForward(binding.forwardProps()),
	}))
	const inputAttrs = createPartProps(() => state.inputAttrs)
	const aria = createPartProps(() => state.aria)
	const inputAria = createPartProps(() => state.inputAria)
	const control = createPartProps(() =>
		toControlAttrs<NumberInputAttributes>(binding.forwardProps()),
	)
	const text = fieldText(() => state.text)

	function clear(event: MouseEvent): void {
		event.stopPropagation()
		ctrl.clear()
	}

	function content(): JSX.Element {
		const leadingSlot = resolveSlot(
			() => props.leading,
			() => ({ ctrl }),
		)
		const clearSlot = resolveSlot(
			() => props.clear,
			() => ({ clear: ctrl.clear }),
		)
		const trailingSlot = resolveSlot(
			() => props.trailing,
			() => ({ ctrl }),
		)
		const decrementIcon = resolveSlot(
			() => props['decrement-icon'],
			() => ({}),
		)
		const incrementIcon = resolveSlot(
			() => props['increment-icon'],
			() => ({}),
		)

		return (
			<>
				<Show when={leadingSlot()}>
					<div class="so-number-input__leading">{leadingSlot()}</div>
				</Show>
				<input
					type="text"
					class="so-number-input__input"
					id={state.id}
					placeholder={state.placeholder}
					disabled={state.disabled}
					readonly={state.readonly}
					required={state.required}
					autocomplete="off"
					spellcheck="false"
					{...inputAttrs()}
					{...aria()}
					{...inputAria()}
					{...control()}
					{...text}
				/>
				<Show
					when={
						state.clearable === true ||
						clearSlot() !== undefined ||
						trailingSlot() !== undefined
					}
				>
					<div class="so-number-input__trailing">
						<Show
							when={clearSlot()}
							fallback={
								<Show when={state.clearable}>
									<Button
										embedded="number-input.clear"
										type="button"
										class="so-number-input__clear"
										size={state.size}
										disabled={state.disabled}
										{...state.clearAria}
										onActionClick={clear}
									>
										<Icon
											embedded="number-input.clear-icon"
											tag={CloseGlyph}
											size={state.size}
										/>
									</Button>
								</Show>
							}
						>
							{clearSlot()}
						</Show>
						{trailingSlot()}
					</div>
				</Show>
				{/* Кнопки шага — последними, у края поля: их место не зависит от слотов */}
				<div class="so-number-input__stepper">
					<Button
						embedded="number-input.decrement"
						type="button"
						class="so-number-input__decrement"
						size={state.size}
						disabled={state.decrementDisabled}
						{...state.decrementAria}
						{...state.decrementDataset}
					>
						{decrementIcon() ?? (
							<Icon
								embedded="number-input.decrement-icon"
								tag={MinusGlyph}
								size={state.size}
							/>
						)}
					</Button>
					<Button
						embedded="number-input.increment"
						type="button"
						class="so-number-input__increment"
						size={state.size}
						disabled={state.incrementDisabled}
						{...state.incrementAria}
						{...state.incrementDataset}
					>
						{incrementIcon() ?? (
							<Icon
								embedded="number-input.increment-icon"
								tag={PlusGlyph}
								size={state.size}
							/>
						)}
					</Button>
				</div>
				<input
					type="hidden"
					name={state.name}
					value={state.value === undefined ? '' : String(state.value)}
					disabled={state.disabled}
				/>
			</>
		)
	}

	return (
		<Show when={state.rendered}>
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				<Elevate layer={binding.layer}>{content()}</Elevate>
			</Root>
		</Show>
	)
}
