<script lang="ts">
import { Icon } from '../icon'
import SetupCheckBox from './setup.component'

export default { ...SetupCheckBox }
</script>

<template>
    <div
        ref="rootElement"
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
