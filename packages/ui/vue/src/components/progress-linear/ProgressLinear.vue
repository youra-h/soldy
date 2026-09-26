<script lang="ts">
import SetupProgressLinear from './setup.component'

export default { ...SetupProgressLinear }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:style="percentStyle"
		v-bind="{ ...attrs, ...aria, ...dataset }"
	>
		<!--
			Индикатор выполнения — линия. Корень и есть дорожка во всю длину, в нём
			заливка доли готового. Корень рисуется по `tag`, по умолчанию `span`:
			полосу кладут в `Button` и `Label`, а внутри них HTML разрешает только
			строчную разметку. Поэтому и заливка — `span`.

			Разметка статическая: размер и вариант (`--size-*`, `--variant-*`),
			доля (переменная `--s-progress-linear-percent` в `style`), бег
			(`data-indeterminate`), роль, значения и имя для скринридера и `dir`
			приходят кодом, здесь только состав и имена классов.

			Текста и слотов нет: содержимое узла с ролью `progressbar` скринридер
			не читает, а в тонкую полосу текст не влезет. Подпись и число
			потребитель ставит рядом своей разметкой.
		-->

		<!--
			Заливка — доля готового от начала строки, в RTL — справа. Длина — из
			переменной на корне. Пока доля неизвестна, заливку тема прячет, а бег
			рисует псевдоэлементом корня: своего узла у бегущего отрезка нет.
		-->
		<span class="s-progress-linear__range"></span>
	</component>
</template>
