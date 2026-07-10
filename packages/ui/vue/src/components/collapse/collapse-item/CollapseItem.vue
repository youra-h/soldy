<script lang="ts">
import { Icon } from '../../icon'
import { Button } from '../../button'
import SetupCollapseItem from './setup.component'

export default { ...SetupCollapseItem, components: { Icon, Button } }
</script>

<template>
	<div
		ref="rootRef"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:style="{ order }"
		v-bind="containerAttrs"
	>
		<Button
			class="s-collapse-item__header"
			:view="view"
			:disabled="disabled"
			:size="size"
			:variant="variant"
			@click="ctrl.toggleSelected()"
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

<style lang="scss">
.s-collapse-item {
	$this: &;

	@apply flex flex-col w-full;

	&__header {
		@apply w-full justify-start;
		@apply py-2;
	}

	.s-button {
		&__text {
			@apply text-left;
		}
	}

	&__arrow {
		@apply transition-transform duration-300;
		@apply shrink-0;
	}

	&--selected &__arrow {
		@apply rotate-90;
	}

	&__body {
		@apply grid grid-rows-[0fr];
		transition: grid-template-rows 300ms ease;
	}

	&--selected > &__body {
		@apply grid-rows-[1fr];
	}

	&__content {
		@apply overflow-hidden py-0;
		transition: padding 300ms ease;
	}

	&--selected &__content {
		@apply py-2;
	}
}
</style>
