<script lang="ts">
import { Icon } from '../../icon'
import { Button } from '../../button'
import SetupAccordionItem from './setup.component'

export default { ...SetupAccordionItem, components: { Icon, Button } }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:style="{ order: order }"
		v-bind="{ ...dataset, ...containerAttrs, ...attrs }"
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

			Стрелка — в обёртке, и класс стрелки на обёртке, а не на иконке:
			тема поворачивает стрелку раскрытой секции по
			`.s-accordion-item__arrow`, и иконка, подменённая слотом
			`leading-icon` или `trailing-icon`, поворачивается так же. Поставь
			класс на `Icon` — и подменённая стрелка перестала бы поворачиваться,
			причём молча (как `s-select__arrow` у Select). Обёртка стоит, пока на
			её стороне стрелка по умолчанию или задан слот.
		-->
		<Button
			embedded="accordion.header"
			class="s-accordion-item__header"
			:view="view"
			:disabled="disabled"
			:size="size"
			:variant="variant"
			@click="context?.adapters.selection.toggle()"
			v-bind="{ ...aria, ...controlAttrs }"
		>
			<template #leading>
				<span
					v-if="arrowPlacement === 'start' || $slots['leading-icon']"
					class="s-accordion-item__arrow"
				>
					<slot name="leading-icon">
						<Icon
							embedded="accordion.arrow"
							v-if="arrowPlacement === 'start'"
							:tag="arrowIconTag"
							:size="size"
						/>
					</slot>
				</span>
				<slot name="leading" />
			</template>

			<slot name="header" :text="text" :selected="selected">
				{{ text }}
			</slot>

			<template #trailing>
				<slot name="trailing" />
				<span
					v-if="arrowPlacement === 'end' || $slots['trailing-icon']"
					class="s-accordion-item__arrow"
				>
					<slot name="trailing-icon">
						<Icon
							embedded="accordion.arrow"
							v-if="arrowPlacement === 'end'"
							:tag="arrowIconTag"
							:size="size"
						/>
					</slot>
				</span>
			</template>
		</Button>

		<div class="s-accordion-item__body">
			<div class="s-accordion-item__content" v-bind="contentAria">
				<slot />
			</div>
		</div>
	</component>
</template>
