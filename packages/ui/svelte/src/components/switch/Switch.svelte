<script lang="ts">
	import { Dynamic, toControlAttrs, toRootForward, toRootProps } from '../../adapter'
	import { setupSwitch } from './setup.component'
	import type { SwitchAttributes, SwitchProps } from './base.component'

	const props: SwitchProps = $props()
	const mountId = $props.id()

	const binding = setupSwitch(() => props, mountId)
	const state = binding.state
	const ctrl = binding.ctrl
</script>

<!--
	Switch — переключатель: корень по `tag` и нативный
	`<input type="checkbox">` внутри, рядом — дорожка с ручкой.

	Корень по умолчанию — `span`: переключатель кладут в подпись `Label`, а
	внутри `label` HTML разрешает только строчную разметку. Поэтому и всё
	внутри — `span`.

	`role="switch"` ядро пишет в `aria` поля, состояние скринридеру сообщает
	нативный `checked` — Svelte пишет его свойством узла, а на сервере —
	атрибутом; переключает значение плагин по `change` поля. Атрибуты
	потребителя делятся, как у CheckBox: класс и стиль — корню, остальное —
	полю.

	Дорожка — декор: `aria-hidden` не пускает содержимое слотов в доступное
	имя, которое переключателю даёт подпись. В ручке — слот `on` у включённого
	и `off` у выключенного, scope `{ value, ctrl }`.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(state, [state.attrs], toRootForward(binding.forwardProps))}
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
		/>
		<span class="s-switch__track" aria-hidden="true">
			<span class="s-switch__track--thumb">
				{#if state.value}
					{@render props.on?.({ value: state.value, ctrl })}
				{:else}
					{@render props.off?.({ value: state.value, ctrl })}
				{/if}
			</span>
		</span>
	</Dynamic>
{/if}
