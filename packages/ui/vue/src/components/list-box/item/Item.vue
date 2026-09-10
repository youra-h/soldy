<script lang="ts">
import { Icon } from '../../icon'
import { Button } from '../../button'
import SetupListBoxItem from './setup.component'

/**
 * Обёртка отметки рисуется, пока `indicator` не `none` — и у невыбранных тоже:
 * она резервирует место, иначе строка прыгала бы при выборе. Иконка внутри —
 * только у выбранного.
 *
 * Сторона логическая (`start`/`end`), поэтому в RTL отметка сама оказывается с
 * нужного края: `dir` стоит на корне элемента, а строка — flex.
 *
 * `aria-hidden`: отметка декоративна, состояние скринридеру объявляет
 * `aria-selected`. Два источника одного факта дали бы двойное объявление.
 */
export default { ...SetupListBoxItem, components: { Icon, Button } }
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
			v-bind="{ ...aria, ...dataset, ...controlAttrs }"
		>
			<template #leading>
				<span
					v-if="indicator === 'start'"
					class="s-list-box-item__indicator"
					aria-hidden="true"
				>
					<slot name="indicator-icon" :selected="selected">
						<Icon v-if="selected" :tag="indicatorIconTag" :size="size" />
					</slot>
				</span>
				<slot name="leading" />
			</template>

			<slot name="default" :text="text" :selected="selected">
				{{ text }}
			</slot>

			<template #trailing>
				<slot name="trailing" />
				<span v-if="indicator === 'end'" class="s-list-box-item__indicator" aria-hidden="true">
					<slot name="indicator-icon" :selected="selected">
						<Icon v-if="selected" :tag="indicatorIconTag" :size="size" />
					</slot>
				</span>
			</template>
		</Button>
	</div>
</template>
