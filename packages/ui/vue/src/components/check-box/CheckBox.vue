<script lang="ts">
import { Icon } from '../icon'
import SetupCheckBox from './setup.component'

export default { ...SetupCheckBox }
</script>

<template>
    <div
        ref="rootRef"
        v-if="rendered"
        v-show="visible"
        :class="classes"
        v-bind="containerAttrs"
    >
        <input
            type="checkbox"
            :id="ctrl.uid.toString()"
            :checked="value"
            :name="name"
            :disabled="disabled"
            :required="required"
            :aria-checked="ctrl.getAriaChecked()"
            v-bind="controlAttrs"
        />
        <div class="s-check-box__container">
            <!-- Слот для checked иконки -->
            <slot
                v-if="value && !indeterminate"
                name="icon"
                :value="value"
                :indeterminate="indeterminate"
            >
                <Icon :tag="defaultIconTag" :size="size" />
            </slot>
            <!-- Слот для indeterminate иконки -->
            <slot
                v-else-if="indeterminate"
                name="indeterminate-icon"
                :value="value"
                :indeterminate="indeterminate"
            >
                <Icon :tag="defaultIndeterminateIconTag" :size="size" />
            </slot>
        </div>
    </div>
</template>

<style lang="scss">
@use './mixines' as mixines;
@use './../../styles/required' as required;
.s-check-box {
    $this: &;

    @apply w-5 h-5;
    @apply relative select-none;

    input {
        @apply absolute inset-0 opacity-0;
        @apply w-full h-full m-0 p-0;
        @apply cursor-pointer;
        @apply z-10;

        &:disabled {
            @apply cursor-default pointer-events-none;

            + #{$this}__container {
                @apply opacity-s-component-disabled;
            }
        }

        &:focus-visible + #{$this}__container {
            @apply outline-2 outline-offset-2 outline-s-component;
        }
    }

    &__container {
        @apply flex items-center justify-center;
        @apply w-full h-full rounded-md border;
        @apply bg-white;
        @apply transition-colors duration-150;
    }

    &--plain {
        input {
            &:focus-visible + #{$this}__container {
                @apply outline-0;
            }
        }

        #{$this}__container {
            @apply border-0;
            @apply bg-transparent;
        }
    }

    &--required {
        #{$this}__container::after {
            @include required.required-indicator();
        }
    }

    &--size-sm {
        @apply w-4 h-4;
    }

    &--size-lg {
        @apply w-6 h-6;
    }

    &--size-xl {
        @apply w-7 h-7;
    }

    &--size-2xl {
        @apply w-8 h-8;
    }

    &--normal {
        @include mixines.checkbox-variant($this, $color: 'neutral');
    }

    &--accent {
        @include mixines.checkbox-variant($this, $color: 'accent');
    }

    &--positive {
        @include mixines.checkbox-variant($this, $color: 'positive');
    }

    &--negative {
        @include mixines.checkbox-variant($this, $color: 'negative');
    }

    &--caution {
        @include mixines.checkbox-variant($this, $color: 'caution');
    }
}
</style>
