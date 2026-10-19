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

	// Отметки без слота — иконки по ролям: метка одна на роль (`roleIcon`)
	const CHECK = roleIcon('check')
	const INDETERMINATE = roleIcon('checkIndeterminate')
	const MARK = { class: 'so-check-box__mark' }
</script>

<!--
	CheckBox — флажок: корень по `tag` и нативный `<input type="checkbox">`
	внутри, рядом — коробка с отметкой.

	Корень по умолчанию — `span`: флажок кладут в подпись `Label`, а внутри
	`label` HTML разрешает только строчную разметку. Поэтому и всё внутри —
	`span`.

	Наборы ядра стоят на разных элементах: `attrs` (`dir`) и `dataset`
	(`data-disabled`, `data-invalid`) — на корне, `aria` — на `<input>`: тема
	красит коробку и подпись поля формы `Field` по корню. Нативные `disabled` и `required` поля проводит разметка, и
	ARIA-дублей рядом с ними ядро не пишет. Атрибуты потребителя делятся, как у
	Vue: класс и стиль — корню, остальное — полю, поверх его `aria`.

	Отметку и «выбрано частично» скринридеру сообщают нативные `checked` и
	`indeterminate` поля, `aria-checked` ядро не пишет. Оба Svelte пишет
	свойствами узла; на сервере — атрибутами, но HTML знает только `checked`, и
	«выбрано частично» поле покажет после гидратации. Переключает значение
	плагин флажка по `change` поля.

	Коробка — декор: `aria-hidden` не пускает иконки слотов в доступное имя,
	которое флажку даёт подпись. Отметка — слот `icon` у выбранного и
	`indeterminate-icon` у частично выбранного (scope `{ value, indeterminate }`),
	без слота — иконка из пакета по ролям `check` и `checkIndeterminate`.
	«Выбрано частично» рисуется поверх значения, как у Vue: его снимает клик
	(`toggle` ядра), а не смена `value`.

	Отметка без слота — `<svg>` иконки по роли (`RoleIcon`), а не компонент
	`Icon`: она появляется и пропадает с каждой сменой отметки, и `Icon`
	собирал бы на каждую свой контекст и плагины — в таблице «выбрать все»
	собирала их тысячами. Размер и цвет отметке даёт тема флажка по
	`so-check-box__mark`.
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
