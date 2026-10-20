import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import {
	createRootProps,
	rootTag,
	textareaText,
	toControlAttrs,
	toRootForward,
} from '../../adapter'
import { setupTextarea } from './setup.component'
import type { TextareaAttributes, TextareaProps } from './base.component'

/**
 * Textarea — многострочное поле: корень по `tag` (по умолчанию `div`) и
 * `<textarea>` внутри, под ним — счётчик символов.
 *
 * Наборы ядра стоят на разных элементах, как у Input: `attrs` (`dir`) и
 * `dataset` (`data-disabled`, `data-invalid`, `data-limit`) — на корне,
 * `aria` — на `<textarea>`: тема красит рамку и счётчик по корню, а ошибку
 * скринридеру объявляет поле. Нативные `rows`, `maxlength`, `disabled`,
 * `readonly` и `required` поля проводит разметка, поэтому ARIA-дублей ядро
 * рядом с ними не пишет. Атрибуты потребителя делятся, как у Vue: класс и
 * стиль — корню, всё остальное — полю, поверх его `aria`.
 *
 * Текст поля ведёт ядро: в ядро его несёт плагин ввода, в узел — `ref` поля
 * (`textareaText`), и только когда текст разошёлся с узлом: привязку `value`
 * Solid писал бы узлу его же текст на каждое нажатие. На сервере текст —
 * содержимое `<textarea>`. Высоту по тексту пишет в узел плагин автороста.
 *
 * Счётчик — только при `counter`: текст «12 / 200» пишет плагин имён по
 * локали поддерева (`names_counter`), а набор `counterAria` несёт его `id`.
 * Поле ссылается на него `aria-describedby`, и текст звучит на фокусе поля, а
 * не живым регионом на каждый символ.
 */
export function Textarea(props: TextareaProps): JSX.Element {
	const binding = setupTextarea(props)
	const state = binding.state
	// Корню — его наборы, класс и стиль потребителя; `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: toRootForward(binding.forwardProps()),
	}))
	const control = () => toControlAttrs<TextareaAttributes>(binding.forwardProps())
	const text = textareaText(() => state.value)

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<textarea
					id={state.id}
					name={state.name}
					rows={state.rows}
					maxlength={state.maxlength}
					disabled={state.disabled}
					readonly={state.readonly}
					required={state.required}
					placeholder={state.placeholder}
					{...state.aria}
					{...control()}
					{...text}
				/>
				<Show when={state.counter}>
					<div class="so-textarea__counter" {...state.counterAria}>
						{state.names_counter}
					</div>
				</Show>
			</Dynamic>
		</Show>
	)
}
