import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import {
	Elevate,
	createPartProps,
	createRootProps,
	fieldText,
	resolveSlot,
	roleIcon,
	rootTag,
	toControlAttrs,
	toRootForward,
} from '../../adapter'
import { Button } from '../button'
import { Icon } from '../icon'
import { setupInput } from './setup.component'
import type { InputAttributes, InputProps } from './base.component'

/** Глиф кнопки очистки — компонент на роль: `tag` у Icon — корень, а не роль. */
const CloseGlyph = roleIcon('close')

/**
 * Input — текстовое поле: корень по `tag` (по умолчанию `div`) и `<input>`
 * внутри, по сторонам — слоты `leading` и `trailing`.
 *
 * Наборы ядра стоят на разных элементах: `attrs` (`dir`) и `dataset`
 * (`data-disabled`, `data-invalid`) — на корне, `aria` — на `<input>`: тема
 * красит коробку поля и подпись поля формы `Field` по корню, а ошибку
 * скринридеру объявляет `<input>`. Нативные `disabled`, `readonly` и
 * `required` поля проводит разметка, поэтому ARIA-дублей ядро рядом с ними не
 * пишет. Атрибуты потребителя делятся, как у Vue: класс и стиль — корню, всё
 * остальное — полю, поверх его `aria`.
 *
 * Текст поля ведёт ядро: в ядро его несёт плагин ввода, в узел — `ref` поля
 * (`fieldText`), и только когда текст разошёлся с узлом: привязку `value`
 * Solid писал бы узлу его же текст на каждое нажатие.
 *
 * Слоты стоят по сторонам поля, а не внутри него: `<input>` детей не имеет.
 * Обёртка слота рисуется, только если в неё есть что положить; содержимое
 * получает сам инстанс поля — кнопке рядом с полем нужны его значение и
 * методы. Есть ли слот, разметка решает по нему самому, поэтому слоты
 * разворачивает адаптер, один раз (`resolveSlot`).
 *
 * Кнопка очистки — первой в обёртке у конца поля, перед `trailing`, как у
 * Vue: по `clearable`, выключена вместе с полем, `readonly` её не гасит:
 * select-only Select и есть `readonly`, а очистка там работает. Имя ядро
 * собирает с именем поля (`clearAria`), очищает команда поля `clear`. Своя
 * кнопка — слот `clear` с командой в scope: заменяет встроенную целиком и
 * рисуется, когда задана.
 *
 * Очищает кнопка по `onActionClick` — нативному клику её `TActionPlugin` — и
 * гасит всплытие у самого события, как Vue `@click.stop`: `onClick` Solid
 * делегирует документу, и гасить всплытие там поздно — событие уже прошло
 * корни предков, а select-only Select открывает панель кликом по корню.
 *
 * У кнопки нет `view`: значения вида объявляет тема, и разметка библиотеки их
 * не знает. Кнопку тема красит по контексту (`.so-input__clear`).
 *
 * Поле формы `Field` над полем отдаёт ему ошибку, `id` и ссылки на части
 * (`TFieldControlExtension`), а своему содержимому поле опускает пустую
 * связку: контролы в его слотах — его содержимое, а не контрол поля формы.
 * Поэтому содержимое — в слое лифта поля (`Elevate`), и слоты разворачиваются
 * там же: узлы слота Solid создаёт там, где его развернули, и развёрнутые в
 * теле поля видели бы связку поля формы над ним.
 */
export function Input(props: InputProps): JSX.Element {
	const binding = setupInput(props)
	const state = binding.state
	const ctrl = binding.ctrl
	// Корню — его наборы, класс и стиль потребителя; `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: toRootForward(binding.forwardProps()),
	}))
	// Полю — его `aria`, поверх — остальные атрибуты потребителя
	const aria = createPartProps(() => state.aria)
	const control = createPartProps(() => toControlAttrs<InputAttributes>(binding.forwardProps()))
	const text = fieldText(() => state.value)

	function clear(event: MouseEvent): void {
		event.stopPropagation()
		ctrl.clear()
	}

	/** Содержимое корня — под слоем лифта поля: зовёт его `Elevate`, внутри себя. */
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
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Elevate layer={binding.layer}>{content()}</Elevate>
			</Dynamic>
		</Show>
	)
}
