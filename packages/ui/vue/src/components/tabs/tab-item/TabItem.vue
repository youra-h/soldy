<script lang="ts">
import { TTabItem, type ITabItemProps, type ITabItem } from '@soldy/core';
import BaseTabItem, { syncTabItem } from './tab-item.component';
import {
    useInstance,
    useIconImport,
    useBundle,
    useElementBinding,
    useInstanceBinding,
    useSplitAttrs,
} from '../../../composables';
import { createComponentViewBundle } from '@soldy/plugins';
import { Icon } from '../../icon';
import { Button } from '../../button';
import type { TBaseComponentViewProps } from '../../component-view';

export default {
    name: '_TabItem',
    inheritAttrs: false,
    extends: BaseTabItem,
    components: { Icon, Button },
    setup(props: TBaseComponentViewProps<ITabItemProps, ITabItem>, { emit }) {
        const ctrl = useInstance(TTabItem, props);
        // Инициализация плагинов
        const plugins = useBundle(createComponentViewBundle, props?.plugins);
        // Привязка инстанса к плагинам
        useInstanceBinding(plugins, ctrl);
        // Привязка элемента и инстанса к плагинам
        const rootRef = useElementBinding(plugins);

        const {
            rendered,
            disabled,
            visible,
            classes,
            size,
            variant,
            text,
            active,
            closable,
            order,
        } = syncTabItem({
            props,
            ctrl,
            plugins,
            emit,
        });

        const closeIconTag = useIconImport('close');

        const { containerAttrs, controlAttrs } = useSplitAttrs();

        return {
            containerAttrs,
            controlAttrs,
            ctrl,
            closeIconTag,
            plugins,
            rootRef,
            rendered,
            disabled,
            visible,
            classes,
            size,
            variant,
            text,
            active,
            closable,
            order,
        };
    },
};
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
