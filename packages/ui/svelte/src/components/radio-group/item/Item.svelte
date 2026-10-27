<script lang="ts">
	import { chainHandler, Dynamic, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { setupRadioGroupItem } from './setup.component'
	import type { RadioGroupItemAttributes, RadioGroupItemProps } from './base.component'

	let { ref = $bindable(), ...props }: RadioGroupItemProps = $props()
	const mountId = $props.id()

	const binding = setupRadioGroupItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context
</script>

<!--
	Корень — `label`: клик по подписи выбирает радио. Поле — перед кольцом: кольцо фокуса тема
	рисует соседним селектором от поля. Части вплотную: пустую подпись тема прячет по `:empty`.
	`change` Svelte делегирует корню приложения: плагин группы слышит его раньше модели и
	возвращает поля к прежнему выбору, а сменившуюся в модели отметку Svelte пишет следом.
-->
<!--
	Место в коллекции (`order`) корню не отдаётся — группа радио не раскладывает, номер увёл бы
	радио по чужому флекс-ряду.
-->
<Dynamic
	rendered={state.rendered}
	tag={state.tag}
	attributes={toRootProps(
		{ classes: state.classes, visible: state.visible },
		[state.dataset, state.attrs],
		toRootForward(binding.forwardProps),
	)}
	attach={binding.attachElement}
>
	<input
		class="so-radio-group-item__input"
		type="radio"
		name={state.name}
		value={state.value}
		disabled={state.disabled}
		{...state.aria}
		{...toControlAttrs<RadioGroupItemAttributes>(binding.forwardProps)}
		onchange={chainHandler(() => {
			if (context) context.adapters.activation.active = true
		}, binding.forwardProps.onchange)}
		checked={state.active}
	/><span class="so-radio-group-item__control"
		><span class="so-radio-group-item__indicator"></span></span
	><span class="so-radio-group-item__text"
		>{@render props.children?.({ active: state.active ?? false })}</span
	>
</Dynamic>
