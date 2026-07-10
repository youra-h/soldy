<script lang="ts">
import SetupInput from './setup.component'

export default { ...SetupInput }
</script>

<template>
	<div ref="rootRef" v-if="rendered" v-show="visible" :class="classes" v-bind="containerAttrs">
		<div v-if="$slots.leading" class="s-input__leading">
			<slot name="leading" :instance="instance"> </slot>
		</div>
		<input
			type="text"
			:id="instance.uid.toString()"
			:value="value"
			:name="name"
			:disabled="disabled"
			:readonly="readonly"
			:required="required"
			:placeholder="placeholder"
			v-bind="controlAttrs"
		/>
		<div v-if="$slots.trailing" class="s-input__trailing">
			<slot name="trailing" :instance="instance"> </slot>
		</div>
	</div>
</template>

<style lang="scss">
@use './mixines' as mixines;
@use './../../styles/required' as required;
.s-input {
	$this: &;
	@apply inline-flex items-center;
	@apply relative;

	@apply rounded-md border;
	@apply bg-white;
	@apply text-s-component;
	@apply transition-colors duration-150;

	input {
		@apply w-full;
		@apply outline-none;
		@apply min-w-16;

		&::placeholder {
			@apply text-s-component-placeholder;
		}

		&:focus-visible {
			&:not(:disabled) {
				@apply outline-2 outline-offset-2 outline-s-component;
			}
		}

		&:disabled {
			@apply opacity-s-component-disabled;
			@apply cursor-default;
		}
	}

	&__leading,
	&__trailing {
		@apply flex items-center justify-center gap-1;
		height: calc(100% - 6px);
	}

	&__leading {
		@apply pl-1;
	}

	&__trailing {
		@apply pr-1;
	}

	&--required {
		&#{$this}::after {
			@include required.required-indicator();
		}
	}

	&--normal {
		@include mixines.input-variant('neutral');
	}

	&--accent {
		@include mixines.input-variant('accent');
	}

	&--positive {
		@include mixines.input-variant('positive');
	}

	&--negative {
		@include mixines.input-variant('negative');
	}

	&--caution {
		@include mixines.input-variant('caution');
	}

	&--size-sm {
		input {
			@apply text-sm;
			@apply leading-7 indent-1.5;
		}
		@apply h-7;
	}

	&--size-normal {
		input {
			@apply leading-8 indent-2;
		}
		@apply h-8;
	}

	&--size-lg {
		input {
			@apply text-lg;
			@apply leading-9 indent-2.5;
		}
		@apply h-9;
	}

	&--size-xl {
		input {
			@apply text-xl;
			@apply leading-10 indent-3;
		}
		@apply h-10;
	}

	&--size-2xl {
		input {
			@apply text-2xl;
			@apply leading-11 indent-3.5;
		}
		@apply h-11;
	}
}
</style>
