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
		:style="{ order: order }"
		:aria-selected="selected"
		v-bind="containerAttrs"
	>
		<Button
			class="s-collapse-item__header"
			:view="view"
			:disabled="disabled"
			:size="size"
			:variant="variant"
			@click="context.adapters.selection.toggle()"
			v-bind="controlAttrs"
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
			<div class="s-collapse-item__content">
				<slot />
			</div>
		</div>
	</div>
</template>
