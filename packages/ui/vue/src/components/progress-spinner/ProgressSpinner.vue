<script lang="ts">
import SetupProgressSpinner from './setup.component'

export default { ...SetupProgressSpinner }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:style="fractionStyle"
		v-bind="{ ...attrs, ...aria, ...dataset }"
	>
		<!--
			Индикатор выполнения — кольцо. Корень — коробка кольца, в ней рисунок.
			Корень рисуется по `tag`, по умолчанию `span`: кольцо кладут в
			`Button` и `Label`, а внутри них HTML разрешает только строчную
			разметку.

			Разметка статическая: размер и вариант (`--size-*`, `--variant-*`),
			доля (переменная `--s-progress-spinner-fraction` в `style`), бег
			(`data-indeterminate`), роль, значения и имя для скринридера и `dir`
			приходят кодом, здесь только состав, имена классов и геометрия
			рисунка.

			Текста и слотов нет, как у линии: содержимое узла с ролью
			`progressbar` скринридер не читает, а в кольцо размером с иконку
			число не влезет. Подпись и число потребитель ставит рядом своей
			разметкой.
		-->

		<!--
			Рисунок — декор под `aria-hidden`, как коробка CheckBox: о ходе работы
			говорит роль корня. Три окружности одной геометрии — центр в середине
			поля 16 × 16, радиус 7: при толщине темы 2 кольцо ровно касается краёв
			поля. Вид — у темы: толщина, цвета, начало дуг сверху и бег.

			Длину дуг SVG меряет в долях окружности (`pathLength="1"`): доля
			готового из переменной корня ложится в штрих как есть.
		-->
		<svg class="s-progress-spinner__ring" viewBox="0 0 16 16" aria-hidden="true">
			<!-- Дорожка — полное кольцо под дугами -->
			<circle class="s-progress-spinner__track" cx="8" cy="8" r="7" />
			<!--
				Дуга доли — от начала кольца на долю готового. Пока кольцо бежит,
				тема её прячет, и дуга, вернувшаяся после бега, растёт от нуля.
			-->
			<circle class="s-progress-spinner__range" cx="8" cy="8" r="7" pathLength="1" />
			<!--
				Бегущая дуга — видна, только пока кольцо бежит. Своего движения у
				неё нет: бег — поворот всего рисунка.
			-->
			<circle class="s-progress-spinner__runner" cx="8" cy="8" r="7" pathLength="1" />
		</svg>
	</component>
</template>
