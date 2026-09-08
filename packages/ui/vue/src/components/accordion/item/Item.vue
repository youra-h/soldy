<script lang="ts">
import { Icon } from '../../icon'
import { Button } from '../../button'
import SetupAccordionItem from './setup.component'

export default { ...SetupAccordionItem, components: { Icon, Button } }
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
			Связка «заголовок ↔ панель» приходит из item-адаптера расширения
			`content`: `aria-controls` заголовка и `id` панели — один и тот же
			идентификатор, поэтому считаются в одном месте.

			`aria-selected` с обёртки убран: у неё нет роли, и для скринридера
			он ничего не значил. Но тема раскрывала панель селектором
			`.s-accordion-item[aria-selected='true']`, поэтому обёртка отдаёт то
			же состояние как `data-selected`: ARIA — для скринридера, `data-*` —
			для CSS. Иначе ARIA нельзя починить, не сломав вид.

			Оба набора приходят готовыми из ядра — `dataset` на обёртку,
			`aria` на заголовок. В шаблоне не осталось ни одного вычисления
			состояния: иначе его пришлось бы повторить в пяти других адаптерах.
		-->
		<Button
			class="s-accordion-item__header"
			:view="view"
			:disabled="disabled"
			:size="size"
			:variant="variant"
			@click="context.adapters.selection.toggle()"
			v-bind="{ ...aria, ...controlAttrs }"
		>
			<template #leading>
				<slot name="leading-icon">
					<Icon
						v-if="arrowPlacement === 'start'"
						:tag="arrowIconTag"
						:size="size"
						class="s-accordion-item__arrow"
					/>
				</slot>
				<slot name="leading" />
			</template>

			<slot name="header" :text="text" :selected="selected">
				{{ text }}
			</slot>

			<template #trailing>
				<slot name="trailing" />
				<slot name="trailing-icon">
					<Icon
						v-if="arrowPlacement === 'end'"
						:tag="arrowIconTag"
						:size="size"
						class="s-accordion-item__arrow"
					/>
				</slot>
			</template>
		</Button>

		<div class="s-accordion-item__body">
			<div class="s-accordion-item__content" v-bind="content_aria">
				<slot />
			</div>
		</div>
	</div>
</template>
