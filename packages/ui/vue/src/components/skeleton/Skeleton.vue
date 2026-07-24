<script lang="ts">
import SetupSkeleton from './setup.component'

export default { ...SetupSkeleton }
</script>

<template>
	<component ref="rootElement" :is="tag" :class="classes" :style="skeletonStyles_styles">
		<div class="s-skeleton__placeholder" v-if="present" />
		<slot />
	</component>
</template>

<style lang="scss">
@use './mixins' as mixins;
.s-skeleton {
	$this: &;

	@apply relative block;

	// скрываем всё содержимое slot, пока показывается placeholder
	&:has(.s-skeleton__placeholder) > :not(.s-skeleton__placeholder) {
		@apply opacity-0;
	}

	// size
	&--size-sm {
		@apply w-16 h-4;
	}

	&--size-normal {
		@apply w-20 h-5;
	}

	&--size-lg {
		@apply w-24 h-6;
	}

	&--size-xl {
		@apply w-28 h-7;
	}

	&--size-2xl {
		@apply w-32 h-8;
	}

	&__placeholder {
		@apply absolute inset-0 z-10;

		// shape
		#{$this}--rect & {
			@apply rounded-none;
		}

		#{$this}--rounded & {
			@apply rounded-md;
		}

		#{$this}--circle & {
			@apply rounded-full;
		}

		// animation
		#{$this}--pulse & {
			animation: skeleton-pulse 1.5s ease-in-out infinite;
		}

		#{$this}--wave & {
			@apply overflow-hidden;

			&::after {
				content: '';
				@apply absolute inset-0;
				background: linear-gradient(
					90deg,
					transparent 0%,
					rgba(255, 255, 255, 0.4) 50%,
					transparent 100%
				);
				animation: skeleton-wave 1.5s ease-in-out infinite;
			}
		}

		// variant colors
		#{$this}--normal & {
			@include mixins.skeleton-variant('neutral');
		}

		#{$this}--accent & {
			@include mixins.skeleton-variant('accent');
		}

		#{$this}--positive & {
			@include mixins.skeleton-variant('positive');
		}

		#{$this}--negative & {
			@include mixins.skeleton-variant('negative');
		}

		#{$this}--caution & {
			@include mixins.skeleton-variant('caution');
		}
	}

	@keyframes skeleton-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
	}

	@keyframes skeleton-wave {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(100%);
		}
	}
}
</style>
