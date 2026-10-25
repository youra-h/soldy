import type { JSX } from 'solid-js'
import {
	Elevate,
	Root,
	createPartProps,
	createRootProps,
	renderSlot,
	resolveSlot,
	roleIcon,
} from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { Icon } from '../icon'
import { setupField } from './setup.component'
import type { FieldProps } from './base.component'

/** Значок ошибки — компонент на роль: `tag` у Icon — корень, а не роль. */
const ErrorGlyph = roleIcon('error')

/** Поле формы: подпись, контрол, подсказка и ошибка — один порядок на все стороны. */
export function Field(props: FieldProps): JSX.Element {
	const binding = setupField(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))
	const labelAria = createPartProps(() => state.labelAria)
	const helperAria = createPartProps(() => state.helperAria)
	const errorAria = createPartProps(() => state.errorAria)

	function parts(): JSX.Element {
		const label = resolveSlot(
			() => props['label-content'],
			() => ({}),
		)
		const helper = resolveSlot(
			() => props['helper-content'],
			() => ({}),
		)
		const error = resolveSlot(
			() => props['error-content'],
			() => ({}),
		)

		return (
			<>
				<Show when={state.label}>
					<label class="so-field__label" {...labelAria()}>
						{label() ?? state.label}
					</label>
				</Show>
				<div class="so-field__control">{renderSlot(props.children)}</div>
				<Show when={state.helperRendered}>
					<div class="so-field__helper" {...helperAria()}>
						{helper() ?? state.helper}
					</div>
				</Show>
				<Show when={state.errorRendered}>
					<div class="so-field__error" {...errorAria()}>
						<Icon
							embedded="field.error-icon"
							class="so-field__error-icon"
							tag={ErrorGlyph}
						/>
						<div class="so-field__error-text">{error() ?? state.error}</div>
					</div>
				</Show>
			</>
		)
	}

	return (
		<Show when={state.rendered}>
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				<Elevate layer={binding.layer}>{parts()}</Elevate>
			</Root>
		</Show>
	)
}
