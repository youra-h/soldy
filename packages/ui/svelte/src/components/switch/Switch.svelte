<script lang="ts">
	import { Dynamic, toControlAttrs, toRootForward, toRootProps } from '../../adapter'
	import { setupSwitch } from './setup.component'
	import type { SwitchAttributes, SwitchProps } from './base.component'

	let { ref = $bindable(), ...props }: SwitchProps = $props()
	const mountId = $props.id()

	const binding = setupSwitch(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const ctrl = binding.ctrl
</script>

<!--
	Switch — корень и всё внутри — `span`: переключатель кладут в `Label`, где разрешена
	только строчная разметка. `checked` Svelte пишет свойством, на сервере — атрибутом.
	Дорожка под `aria-hidden`: содержимое слотов не идёт в имя от подписи.
-->
<Dynamic
	rendered={state.rendered}
	tag={state.tag}
	attributes={toRootProps(
		state,
		[state.attrs, state.dataset],
		toRootForward(binding.forwardProps),
	)}
	attach={binding.attachElement}
>
	<input
		type="checkbox"
		id={state.id}
		name={state.name}
		disabled={state.disabled}
		required={state.required}
		{...state.aria}
		{...toControlAttrs<SwitchAttributes>(binding.forwardProps)}
		checked={state.value}
	/><span class="so-switch__track" aria-hidden="true">
		<span class="so-switch__track--thumb">
			{@render (state.value ? props.on : props.off)?.({ value: state.value, ctrl })}
		</span>
	</span>
</Dynamic>
