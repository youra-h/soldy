<script lang="ts">
import { ListBoxItem } from './list-box-item'
import SetupListBox from './setup.component'

export default { ...SetupListBox, components: { ListBoxItem } }
</script>

<template>
	<div
		ref="rootRef"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:aria-disabled="disabled"
		tabindex="0"
	>
		<slot name="header" />
		<slot>
			<ListBoxItem v-for="item in items" :key="item.uid" :ctrl="item">
				<template #leading>
					<slot :name="`item:${item.value}:leading`" :item="item" />
				</template>
				<template #default>
					<slot :name="`item:${item.value}`" :item="item">
						<slot name="item" :item="item" />
					</slot>
				</template>
				<template #trailing>
					<slot :name="`item:${item.value}:trailing`" :item="item" />
				</template>
			</ListBoxItem>
		</slot>
		<slot name="footer" />
	</div>
</template>

<style lang="scss">
.s-list-box {
	@apply flex flex-col gap-1;
	@apply rounded-md;
	@apply min-w-40 max-w-80;
	@apply text-s-component;

	&:focus-visible {
		&:not([aria-disabled='true']) {
			@apply outline-2 outline-offset-2 outline-s-component;
		}
	}

	&--auto-width {
		@apply w-max min-w-0 max-w-none;
	}

	&--word-wrap .s-button__text {
		@apply whitespace-normal overflow-visible;
	}
}
</style>
