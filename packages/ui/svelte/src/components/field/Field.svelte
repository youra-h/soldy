<script lang="ts">
	import { Dynamic, roleIcon, toRootProps } from '../../adapter'
	import { Icon } from '../icon'
	import { setupField } from './setup.component'
	import type { FieldProps } from './base.component'

	let { ref = $bindable(), ...props }: FieldProps = $props()
	const mountId = $props.id()

	const binding = setupField(() => props, mountId, (node) => (ref = node))
	const state = binding.state

	// Значок ошибки — метка роли: `tag` у Icon — корень, а не роль
	const ERROR = roleIcon('error')
</script>

<!--
	Field — поле формы: подпись, контрол, подсказка и ошибка, связанные с
	контролом сами. Корень рисуется по `tag`, по умолчанию `div`. На корне —
	модификаторы `so-field--position-*` (`top`, `start`, `end`) и
	`so-field--size-*`. Своих состояний у Field нет: выключенность, только
	чтение и обязательность тема читает с корня контрола, ошибку контрол рисует
	по своему `data-invalid` — его пишет связка поля с контролом.

	Порядок частей один на все стороны — подпись, контрол, подсказка, ошибка:
	сторону рисует тема. Часть стоит, пока задан её текст: ссылки контрола на
	части ставит ядро, а слотов оно не видит. Ошибка рисуется при `invalid` и
	встаёт на место подсказки. Что рисовать, решает ядро (`helperRendered`,
	`errorRendered`).

	- подпись — проп `label`, своя разметка — слот `label-content`. Связку с
	  контролом — `id` и `for` — несёт набор `labelAria`: `for` на поле у
	  контролов с `<input>`, а группу (RadioGroup) называет ссылка
	  `aria-labelledby` на `id`;
	- контрол — `children` (слот `default`): Input, CheckBox, Switch, RadioGroup
	  или Label с контролом. Связку поле опускает ему лифтом при своей
	  инициализации, и контрол, смонтированный внутри, берёт её своей;
	- подсказка — проп `helper`, своя разметка — слот `helper-content`, её `id`
	  (набор `helperAria`) — в `aria-describedby` контрола;
	- ошибка — проп `error`, своя разметка — слот `error-content`, её `id`
	  (набор `errorAria`) — в `aria-describedby` вместо подсказки. Значок — роль
	  `error`, декор: смысл несёт текст. Размера у значка нет — его ставит тема.
	  Текст — в своей обёртке: ряд из значка и текста — флекс.

	Пробелы по краям блока Svelte срезает сам, и текст части — ровно текст.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.attrs, state.aria, state.dataset],
			binding.forwardProps,
		)}
		attach={binding.attachElement}
	>
		{#if state.label}
			<label class="so-field__label" {...state.labelAria}>
				{#if props['label-content']}
					{@render props['label-content']()}
				{:else}
					{state.label}
				{/if}
			</label>
		{/if}
		<div class="so-field__control">{@render props.children?.()}</div>
		{#if state.helperRendered}
			<div class="so-field__helper" {...state.helperAria}>
				{#if props['helper-content']}
					{@render props['helper-content']()}
				{:else}
					{state.helper}
				{/if}
			</div>
		{/if}
		{#if state.errorRendered}
			<div class="so-field__error" {...state.errorAria}>
				<Icon embedded="field.error-icon" class="so-field__error-icon" tag={ERROR} />
				<div class="so-field__error-text">
					{#if props['error-content']}
						{@render props['error-content']()}
					{:else}
						{state.error}
					{/if}
				</div>
			</div>
		{/if}
	</Dynamic>
{/if}
