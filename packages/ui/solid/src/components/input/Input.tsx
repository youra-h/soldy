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
import { setupInput } from './setup.component'
import type { InputAttributes, InputProps } from './base.component'

/** Глиф кнопки очистки — компонент на роль: `tag` у Icon — корень, а не роль. */
const CloseGlyph = roleIcon('close')

/**
 * Текстовое поле: `<input>` внутри корня, слоты — по сторонам, кнопка очистки — перед `trailing`.
 * Очистка гасит всплытие у самого события (`onActionClick`): `onClick` Solid
 * делегирует документу, а select-only Select открывает панель кликом по корню.
 */
export function Input(props: InputProps): JSX.Element {
	const binding = setupInput(props)
	const state = binding.state
	const ctrl = binding.ctrl
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: toRootForward(binding.forwardProps()),
	}))
	const aria = createPartProps(() => state.aria)
	const control = createPartProps(() => toControlAttrs<InputAttributes>(binding.forwardProps()))
	const text = fieldText(() => state.value)

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

		return (
			<>
				<Show when={leadingSlot()}>
					<div class="so-input__leading">{leadingSlot()}</div>
				</Show>
				<input
					type="text"
					id={state.id}
					name={state.name}
					disabled={state.disabled}
					readonly={state.readonly}
					required={state.required}
					placeholder={state.placeholder}
					{...aria()}
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
					<div class="so-input__trailing">
						<Show
							when={clearSlot()}
							fallback={
								<Show when={state.clearable}>
									{/* `readonly` очистку не гасит: select-only Select — тоже `readonly` */}
									<Button
										embedded="input.clear"
										type="button"
										class="so-input__clear"
										size={state.size}
										disabled={state.disabled}
										{...state.clearAria}
										onActionClick={clear}
									>
										<Icon
											embedded="input.clear-icon"
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
