import { Show, type JSX } from 'solid-js'
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
import { setupRadioGroupItem } from './setup.component'
import type { RadioGroupItemAttributes, RadioGroupItemProps } from './base.component'

/**
 * RadioGroupItem — радио: корень по `tag` (по умолчанию `label`) и нативный
 * `<input type="radio">` внутри, рядом — кольцо с точкой и подпись, как у Vue.
 *
 * Корень — `label`: клик по подписи выбирает радио, а подпись становится его
 * доступным именем. На корне — `dataset` (`data-selected`, `data-disabled`),
 * `attrs` (`dir`) и модификаторы размера, варианта и вида в `classes`: тема
 * читает всё отсюда. Атрибуты потребителя делятся, как у поля: класс и стиль
 * — корню, остальное — радио, поверх его `aria`: `id` для `<label for>`
 * снаружи, обработчики.
 *
 * Группировку по общему `name`, стрелки по кругу, пропуск выключенных,
 * пробел, одну остановку Tab на группу и участие в форме даёт браузер. Набор
 * `aria` радио — на поле; `checked` и `disabled` нативные, ARIA-дублей им нет.
 * Отметку Solid пишет свойством узла, на смену значения ядра, а на сервере —
 * атрибутом; `value` — значение для формы.
 *
 * Выбор пользователя приходит `onChange` поля: браузер уже отметил радио и
 * снял отметку с соседа, коллекции остаётся сделать его активным — как
 * `@change` у Vue. Потом зовётся `onChange` потребителя. `change` Solid не
 * делегирует: слушатель стоит на самом поле, и модель решает раньше, чем
 * событие дойдёт до корня группы, где плагин группы возвращает поля к модели.
 *
 * Поле стоит перед кольцом: кольцо фокуса тема рисует соседним селектором от
 * него, а само поле скрывает. Кольцо и точка — декор без текста: отметку
 * скринридеру сообщает `checked`. Подпись — только слот, своего текста у
 * радио нет; её может не быть, и пустую обёртку тема прячет по `:empty`,
 * поэтому вокруг слота нет ни пробела, ни узла. Scope подписи — отметка радио
 * (`active`), как у содержимого таба; слот разворачивает адаптер, один раз
 * (`resolveSlot`): смена отметки готовые узлы подписи не пересоздаёт.
 */
export function RadioGroupItem(props: RadioGroupItemProps): JSX.Element {
	const binding = setupRadioGroupItem(props)
	const state = binding.state
	const context = binding.context
	// Корню — его наборы, класс и стиль потребителя; `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.dataset, state.attrs],
		forward: toRootForward(binding.forwardProps()),
	}))
	const label = resolveSlot(
		() => props.children,
		() => ({ active: state.active ?? false }),
	)

	// Полю — его `aria`, поверх — атрибуты потребителя
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
