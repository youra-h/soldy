<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { setupProgressLinear } from './setup.component'
	import type { ProgressLinearProps } from './base.component'

	let { ref = $bindable(), ...props }: ProgressLinearProps = $props()
	const mountId = $props.id()

	const binding = setupProgressLinear(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	ProgressLinear — индикатор выполнения линией. Корень и есть дорожка во всю
	длину, в нём заливка доли готового. Корень рисуется по `tag`, по умолчанию
	`span`: полосу кладут в `Button` и `Label`, а внутри них HTML разрешает
	только строчную разметку. Поэтому и заливка — `span`.

	Разметка статическая: размер, вариант и ось (`--size-*`, `--variant-*`,
	`--horizontal` или `--vertical`), доля (переменная
	`--so-progress-linear-percent` из выхода `percentStyle`), бег
	(`data-indeterminate`), роль, значения и имя для скринридера и `dir`
	приходят кодом, здесь только состав и имена классов. Долю раскладка корня
	кладёт под стилем потребителя (`toRootProps`), как во Vue, где атрибуты
	снаружи ложатся на корень последними, а скрытый корень прячет
	`display: none` поверх обоих.

	Текста и слотов нет: содержимое узла с ролью `progressbar` скринридер не
	читает, а в тонкую полосу текст не влезет. Подпись и число потребитель
	ставит рядом своей разметкой.

	Заливка — доля готового от начала строки, в RTL — справа, у вертикальной
	полосы — снизу. Длина — из переменной на корне. Пока полоса бежит, заливку
	тема прячет, а бег рисует псевдоэлементом корня: своего узла у бегущего
	отрезка нет.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.attrs, state.aria, state.dataset],
			binding.forwardProps,
			state.percentStyle,
		)}
		attach={binding.attachElement}
	>
		<span class="so-progress-linear__range"></span>
	</Dynamic>
{/if}
