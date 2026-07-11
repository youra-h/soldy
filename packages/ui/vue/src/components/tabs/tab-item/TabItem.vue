<script lang="ts">
import { Icon } from '../../icon'
import { Button } from '../../button'
import SetupTabItem from './setup.component'

export default { ...SetupTabItem, components: { Icon, Button } }
</script>

<template>
	<div
		ref="rootElement"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:style="{ order }"
		v-bind="containerAttrs"
	>
		<Button
			:disabled="disabled"
			view="none"
			:size="size"
			:variant="variant"
			@click="ctrl.active = true"
			role="tab"
			v-bind="controlAttrs"
		>
			<template #leading>
				<slot name="leading" />
			</template>

			<slot :text="text" :active="active">
				{{ text }}
			</slot>

			<template #trailing>
				<slot name="trailing" />
				<Button
					:rendered="!!closable"
					class="s-tab-item__close"
					@click.stop="ctrl.close()"
					view="plain"
				>
					<slot name="close-icon">
						<Icon :tag="closeIconTag" :size="size" />
					</slot>
				</Button>
			</template>
		</Button>
	</div>
</template>

<style lang="scss">
.s-tab-item {
	$this: &;

	> * {
		@apply opacity-75;
		@apply w-full py-2;

		#{$this}__close {
			@apply px-1;
		}

		&:hover:not([disabled]) {
			@apply opacity-100;
		}

		&:focus-visible {
			@apply outline-2 -outline-offset-2 outline-s-component;
		}
	}

	&--active {
		> * {
			@apply opacity-100;
		}
	}
}
</style>
