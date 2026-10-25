import type { JSX } from 'solid-js'
import {
	Root,
	createPartProps,
	createRootProps,
	textareaText,
	toControlAttrs,
	toRootForward,
} from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { setupTextarea } from './setup.component'
import type { TextareaAttributes, TextareaProps } from './base.component'

/** Многострочное поле: `<textarea>` внутри корня, под ним — счётчик символов при `counter`. */
export function Textarea(props: TextareaProps): JSX.Element {
	const binding = setupTextarea(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: toRootForward(binding.forwardProps()),
	}))
	const aria = createPartProps(() => state.aria)
	const control = createPartProps(() =>
		toControlAttrs<TextareaAttributes>(binding.forwardProps()),
	)
	const counterAria = createPartProps(() => state.counterAria)
	const text = textareaText(() => state.value)

	return (
		<Show when={state.rendered}>
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				<textarea
					id={state.id}
					name={state.name}
					rows={state.rows}
					maxlength={state.maxlength}
					disabled={state.disabled}
					readonly={state.readonly}
					required={state.required}
					placeholder={state.placeholder}
					{...aria()}
					{...control()}
					{...text}
				/>
				<Show when={state.counter}>
					<div class="so-textarea__counter" {...counterAria()}>
						{state.names_counter}
					</div>
				</Show>
			</Root>
		</Show>
	)
}
