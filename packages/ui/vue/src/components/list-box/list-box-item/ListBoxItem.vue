<script lang="ts">
import { Button } from '../../button'
import SetupListBoxItem from './setup.component'

export default { ...SetupListBoxItem, components: { Button } }
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
			:tag="tag"
			:view="view"
			:disabled="disabled"
			:size="size"
			:variant="variant"
			:aria-selected="selected"
			:data-highlighted="highlighted"
			@click="instance.toggleSelected()"
			v-bind="controlAttrs"
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

<style lang="scss">
.s-list-box-item {
	@apply min-h-fit;

	.s-button {
		&__text {
			@apply text-left min-w-0;
		}
	}

	&--word-wrap {
		.s-button {
			&__text {
				@apply whitespace-normal overflow-visible;
			}
		}
	}
}
</style>
