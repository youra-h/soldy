import type { Accessor, JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import type { TDateInputPart, TDateInputSegment } from '@soldy-ui/core'
import {
	Elevate,
	KeyedFor,
	createPartProps,
	createRootProps,
	resolveSlot,
	roleIcon,
	rootTag,
} from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { Button } from '../button'
import { Icon } from '../icon'
import { setupDateInput } from './setup.component'
import type { DateInputProps } from './base.component'

/** Глиф кнопки очистки — компонент на роль: `tag` у Icon — корень, а не роль. */
const CloseGlyph = roleIcon('close')

/** Часть поля; у разделителя её нет. */
function partOf(segment: TDateInputSegment): TDateInputPart | undefined {
	return segment.type === 'literal' ? undefined : segment
}

/**
 * Поле даты из частей по формату локали; атрибуты потребителя — корню целиком. Текст части —
 * `textContent`, а не ребёнок разметки: редактируемую часть браузер правит сам.
 */
export function DateInput(props: DateInputProps): JSX.Element {
	const binding = setupDateInput(props)
	const state = binding.state
	const ctrl = binding.ctrl
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))
	const segmentsAttrs = createPartProps(() => state.segmentsAttrs)

	/** Клик очистки не всплывает к предку, который слушает поле. */
	function clear(event: MouseEvent): void {
		event.stopPropagation()
		ctrl.clear()
	}

	/** Часть или разделитель: тип у записи с одним ключом не меняется, ветка `Show` у узла одна. */
	function segment(entry: Accessor<TDateInputSegment>): JSX.Element {
		const aria = createPartProps(() => entry().aria)

		return (
			<Show
				when={partOf(entry())}
				fallback={
					<span class="so-date-input__literal" {...aria()} textContent={entry().text} />
				}
			>
				{(part) => {
					const attrs = createPartProps(() => part().attrs)
					const dataset = createPartProps(() => part().dataset)

					return (
						<span
							class="so-date-input__segment"
							{...attrs()}
							{...aria()}
							{...dataset()}
							textContent={part().text}
						/>
					)
				}}
			</Show>
		)
	}

	/** Содержимое корня: зовётся внутри `Elevate`, и слоты разворачиваются в слое поля. */
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
					<div class="so-date-input__leading">{leadingSlot()}</div>
				</Show>
				<span class="so-date-input__segments" {...segmentsAttrs()}>
					<KeyedFor each={state.segments} by={(entry) => entry.key}>
						{segment}
					</KeyedFor>
				</span>
				<Show
					when={
						state.clearable === true ||
						clearSlot() !== undefined ||
						trailingSlot() !== undefined
					}
				>
					<div class="so-date-input__trailing">
						<Show
							when={clearSlot()}
							fallback={
								<Show when={state.clearable}>
									<Button
										embedded="date-input.clear"
										type="button"
										class="so-date-input__clear"
										size={state.size}
										disabled={state.disabled}
										{...state.clearAria}
										onActionClick={clear}
									>
										<Icon
											embedded="date-input.clear-icon"
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
				<input
					type="hidden"
					name={state.name}
					value={state.value ?? ''}
					disabled={state.disabled}
				/>
			</>
		)
	}

	return (
		<Show when={state.rendered}>
			<Dynamic id={state.id} {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Elevate layer={binding.layer}>{content()}</Elevate>
			</Dynamic>
		</Show>
	)
}
