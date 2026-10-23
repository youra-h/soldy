<script lang="ts">
	import {
		Dynamic,
		RoleIcon,
		roleIcon,
		toControlAttrs,
		toRootForward,
		toRootProps,
	} from '../../adapter'
	import { setupCheckBox } from './setup.component'
	import type { CheckBoxAttributes, CheckBoxProps } from './base.component'

	let { ref = $bindable(), ...props }: CheckBoxProps = $props()
	const mountId = $props.id()

	const binding = setupCheckBox(() => props, mountId, (node) => (ref = node))
	const state = binding.state

	// `<svg>` роли (`RoleIcon`), а не Icon: «выбрать все» в таблице собирало бы Icon тысячами
	const CHECK = roleIcon('check')
	const INDETERMINATE = roleIcon('checkIndeterminate')
	const MARK = { class: 'so-check-box__mark' }
</script>

<!--
	CheckBox — корень и всё внутри — `span`: флажок кладут в `Label`, где разрешена только
	строчная разметка. `checked` и `indeterminate` Svelte пишет свойствами; на сервере —
	атрибутами, но HTML знает только `checked`, и «выбрано частично» поле покажет после
	гидратации. Коробка под `aria-hidden`: иконки слотов не идут в имя от подписи.
-->
{#if state.rendered}
	<Dynamic
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
			{...toControlAttrs<CheckBoxAttributes>(binding.forwardProps)}
			checked={state.value}
			indeterminate={state.indeterminate}
		/>
		<span class="so-check-box__container" aria-hidden="true">
			{#if state.indeterminate}
				{#if props['indeterminate-icon']}
					{@render props['indeterminate-icon']({ value: state.value, indeterminate: true })}
				{:else}
					<RoleIcon icon={INDETERMINATE} attributes={MARK} />
				{/if}
			{:else if state.value}
				{#if props.icon}
					{@render props.icon({ value: state.value, indeterminate: false })}
				{:else}
					<RoleIcon icon={CHECK} attributes={MARK} />
				{/if}
			{/if}
		</span>
	</Dynamic>
{/if}
