<script lang="ts">
import { Icon } from '../../icon'
import { Button } from '../../button'
import SetupCollapseItem from './setup.component'

export default { ...SetupCollapseItem, components: { Icon, Button } }
</script>

<template>
	<div
		ref="rootElement"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:dir="dir ?? undefined"
		:style="{ order: order }"
		v-bind="containerAttrs"
	>
		<!--
			Связка «заголовок ↔ панель» приходит из item-адаптера расширения
			`content`: `aria-controls` заголовка и `id` панели — один и тот же
			идентификатор, поэтому считаются в одном месте.

			`aria-selected` с обёртки убран: у неё нет роли, и для скринридера
			он ничего не значил.
		-->
		<Button
			class="s-collapse-item__header"
			:view="view"
			:disabled="disabled"
			:size="size"
			:variant="variant"
			@click="context.adapters.selection.toggle()"
			v-bind="{ ...header_aria, ...controlAttrs }"
		>
			<template #leading>
				<slot name="leading-icon">
					<Icon
						v-if="arrowPlacement === 'start'"
						:tag="arrowIconTag"
						:size="size"
						class="s-collapse-item__arrow"
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
						class="s-collapse-item__arrow"
					/>
				</slot>
			</template>
		</Button>

		<div class="s-collapse-item__body">
			<div class="s-collapse-item__content" v-bind="content_aria">
				<slot />
			</div>
		</div>
	</div>
</template>
