import type { JSX } from 'solid-js'
import {
	Elevate,
	Root,
	createPartNode,
	createRootProps,
	resolveSlot,
	roleIcon,
	toControlAttrs,
	toRootForward,
} from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { setupCheckBox } from './setup.component'
import type { CheckBoxAttributes, CheckBoxProps } from './base.component'

/** Отметки без слота — иконки по ролям, компонент на роль один на модуль (`roleIcon`). */
const CheckMark = roleIcon('check')
const IndeterminateMark = roleIcon('checkIndeterminate')

/**
 * Флажок: нативный `<input type="checkbox">` и коробка с отметкой; всё — `span` (кладут в `Label`).
 * Отметка — `svg` роли, а не Icon: она пропадает с каждой сменой, и Icon собирал бы
 * контекст и плагины на каждую — в таблице «выбрать все» тысячами.
 */
export function CheckBox(props: CheckBoxProps): JSX.Element {
	const binding = setupCheckBox(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: toRootForward(binding.forwardProps()),
	}))
	const scope = () => ({ value: state.value, indeterminate: state.indeterminate ?? false })

	function content(): JSX.Element {
		const icon = resolveSlot(() => props.icon, scope)
		const indeterminateIcon = resolveSlot(() => props['indeterminate-icon'], scope)
		// Узел — в теле, а не вызовом в разметке: вызов компилятор обернул бы в мемо
		const input = createPartNode('input', () => ({
			type: 'checkbox',
			id: state.id,
			name: state.name,
			disabled: state.disabled,
			required: state.required,
			...state.aria,
			...toControlAttrs<CheckBoxAttributes>(binding.forwardProps()),
			checked: state.value,
			'prop:indeterminate': state.indeterminate,
		}))

		return (
			<>
				{input}
				<span class="so-check-box__container" aria-hidden="true">
					<Show
						when={state.indeterminate}
						fallback={
							<Show when={state.value}>
								{icon() ?? <CheckMark class="so-check-box__mark" />}
							</Show>
						}
					>
						{indeterminateIcon() ?? <IndeterminateMark class="so-check-box__mark" />}
					</Show>
				</span>
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
