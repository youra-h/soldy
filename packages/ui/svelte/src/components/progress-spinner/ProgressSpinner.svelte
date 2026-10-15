<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { setupProgressSpinner } from './setup.component'
	import type { ProgressSpinnerProps } from './base.component'

	let { ref = $bindable(), ...props }: ProgressSpinnerProps = $props()
	const mountId = $props.id()

	const binding = setupProgressSpinner(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	ProgressSpinner — индикатор выполнения кольцом. Корень — коробка кольца, в
	ней рисунок. Корень рисуется по `tag`, по умолчанию `span`: кольцо кладут в
	`Button` и `Label`, а внутри них HTML разрешает только строчную разметку.

	Разметка статическая: размер и вариант (`--size-*`, `--variant-*`), доля
	(переменная `--s-progress-spinner-fraction` из выхода `fractionStyle`), бег
	(`data-indeterminate`), роль, значения и имя для скринридера и `dir`
	приходят кодом, здесь только состав, имена классов и геометрия рисунка.
	Долю раскладка корня кладёт под стилем потребителя (`toRootProps`), как во
	Vue, где атрибуты снаружи ложатся на корень последними, а скрытый корень
	прячет `display: none` поверх обоих.

	Текста и слотов нет, как у линии: содержимое узла с ролью `progressbar`
	скринридер не читает, а в кольцо размером с иконку число не влезет. Подпись
	и число потребитель ставит рядом своей разметкой.

	Рисунок — декор под `aria-hidden`, как коробка CheckBox: о ходе работы
	говорит роль корня. Три окружности одной геометрии — центр в середине поля
	16 × 16, радиус 7: при толщине темы 2 кольцо ровно касается краёв поля. Вид
	— у темы: толщина, цвета, начало дуг сверху и бег. Длину дуг SVG меряет в
	долях окружности (`pathLength="1"`): доля готового из переменной корня
	ложится в штрих как есть.

	Дорожка — полное кольцо под дугами. Дуга доли — от начала кольца на долю
	готового: пока кольцо бежит, тема её прячет, и дуга, вернувшаяся после бега,
	растёт от нуля. Бегущая дуга видна, только пока кольцо бежит; своего
	движения у неё нет — бег это поворот всего рисунка.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.attrs, state.aria, state.dataset],
			binding.forwardProps,
			state.fractionStyle,
		)}
		attach={binding.attachElement}
	>
		<svg class="s-progress-spinner__ring" viewBox="0 0 16 16" aria-hidden="true">
			<circle class="s-progress-spinner__track" cx="8" cy="8" r="7" />
			<circle class="s-progress-spinner__range" cx="8" cy="8" r="7" pathLength="1" />
			<circle class="s-progress-spinner__runner" cx="8" cy="8" r="7" pathLength="1" />
		</svg>
	</Dynamic>
{/if}
