<script lang="ts">
import SetupDragAndDrop from './setup.component'

export default { ...SetupDragAndDrop }
</script>

<template>
	<slot />
</template>

<style lang="scss">
.s-drag-and-drop {
	&__item {
		@apply select-none;
		@apply relative rounded-lg;
		@apply isolate;
		@apply shadow-sm;
		@apply #{'!opacity-70'};

		&::after {
			content: '';
			@apply absolute inset-0;
			@apply pointer-events-none;
			@apply rounded-lg;
			@apply opacity-20;
			@apply bg-neutral-50;

			background-image: radial-gradient(currentColor 1px, transparent 1px);
			background-size: 3px 3px;
		}
	}
}
</style>
