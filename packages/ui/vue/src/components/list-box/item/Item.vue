<script lang="ts">
import { Button } from '../../button'
import SetupListBoxItem from './setup.component'

export default { ...SetupListBoxItem, components: { Button } }
</script>

<template>
	<div
		ref="rootElement"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:dir="dir ?? undefined"
		:style="{ order: order }"
		v-bind="{ ...dataset, ...containerAttrs }"
	>
		<!--
			`dataset` биндится дважды, и это не описка. Тема читает
			`data-word-wrap` с обёртки, а `data-selected` / `data-highlighted`
			— с `.s-button`: у ListBox состояние размазано по двум элементам,
			в отличие от Select и Accordion, где всё на обёртке.

			Разложить набор в обе точки дешевле, чем переносить состояние: у
			`.s-button` подсветка и выбор раскрашены по вариантам, а у элемента
			списка своих таких правил нет. Приводить разметку к одному носителю
			— часть задачи про доступность ListBox, там же, где ему добавят
			`role="option"`; сейчас `aria-selected` всё ещё захардкожен здесь,
			а не приходит набором.
		-->
		<Button
			:tag="tag"
			:view="view"
			:disabled="disabled"
			:size="size"
			:variant="variant"
			:aria-selected="String(selected)"
			@click="context.adapters.selection.toggle()"
			v-bind="{ ...dataset, ...controlAttrs }"
		>
			<template #leading>
				<slot name="leading" />
			</template>

			<slot name="default" :text="text" :selected="selected">
				{{ text }}
			</slot>

			<template #trailing>
				<slot name="trailing" />
			</template>
		</Button>
	</div>
</template>
