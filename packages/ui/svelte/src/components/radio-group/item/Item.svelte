<script lang="ts">
	import type { ChangeEventHandler } from 'svelte/elements'
	import { Dynamic, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { setupRadioGroupItem } from './setup.component'
	import type { RadioGroupItemAttributes, RadioGroupItemProps } from './base.component'

	let { ref = $bindable(), ...props }: RadioGroupItemProps = $props()
	const mountId = $props.id()

	const binding = setupRadioGroupItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context

	/**
	 * Атрибуты поля — всё от потребителя, кроме класса и стиля: `id` для
	 * `<label for>` снаружи, обработчики. Выбор пользователя приходит `change`
	 * поля: браузер уже отметил радио и снял отметку с соседа, коллекции
	 * остаётся сделать его активным. Потом зовётся `change` потребителя.
	 */
	function controlAttributes() {
		const { onchange, ...control } = toControlAttrs<RadioGroupItemAttributes>(
			binding.forwardProps,
		)
		const choose: ChangeEventHandler<HTMLInputElement> = (event) => {
			if (context) context.adapters.activation.active = true
			onchange?.(event)
		}

		return { ...control, onchange: choose }
	}
</script>

<!--
	RadioGroupItem — радио: корень по `tag` (по умолчанию `label`) и нативный
	`<input type="radio">` внутри, рядом — кольцо с точкой и подпись, как у Vue.

	Корень — `label`: клик по подписи выбирает радио, а подпись становится его
	доступным именем. На корне — `dataset` (`data-selected`, `data-disabled`),
	`attrs` (`dir`) и модификаторы размера, варианта и вида в `classes`: тема
	читает всё отсюда. Атрибуты потребителя делятся, как у поля: класс и стиль
	— корню, остальное — радио, поверх его `aria`.

	Группировку по общему `name`, стрелки по кругу, пропуск выключенных,
	пробел, одну остановку Tab на группу и участие в форме даёт браузер. Набор
	`aria` радио — на поле; `checked` и `disabled` нативные, ARIA-дублей им нет.
	Отметку Svelte пишет свойством узла, а на сервере — атрибутом. Выбор,
	отменённый в `item:activate:before`, браузер уже отметил, а модель не
	сменилась — поле к ней возвращает плагин группы. Обработчик `change`
	Svelte делегирует корню приложения, и плагин на корне группы слышит
	`change` раньше, чем модель решила: поля он возвращает к прежнему выбору, а
	отметку, которая сменилась в модели, Svelte следом пишет сам.

	Поле стоит перед кольцом: кольцо фокуса тема рисует соседним селектором от
	него, а само поле скрывает. Кольцо и точка — декор без текста: отметку
	скринридеру сообщает `checked`. Подпись — только слот, своего текста у
	радио нет; её может не быть, и пустую обёртку тема прячет по `:empty`,
	поэтому части стоят вплотную: пробел между ними Svelte оставил бы
	текстом. Scope подписи — отметка радио (`active`), как у содержимого таба.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.dataset, state.attrs],
			toRootForward(binding.forwardProps),
		)}
		attach={binding.attachElement}
	>
		<input
			class="s-radio-group-item__input"
			type="radio"
			name={state.name}
			value={state.value}
			disabled={state.disabled}
			{...state.aria}
			{...controlAttributes()}
			checked={state.active}
		/><span class="s-radio-group-item__control"
			><span class="s-radio-group-item__indicator"></span></span
		><span class="s-radio-group-item__text"
			>{@render props.children?.({ active: state.active ?? false })}</span
		>
	</Dynamic>
{/if}
