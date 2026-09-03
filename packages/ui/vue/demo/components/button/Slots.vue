<script setup lang="ts">
import { Button, Icon, useIconImport } from '@soldy/ui-vue';
import type { TComponentSize, TComponentVariant } from '@soldy/core';

type Props = {
    size?: TComponentSize;
    variant?: TComponentVariant;
    disabled?: boolean;
};

const props = defineProps<Props>();

const icon1 = useIconImport('home');
const icon2 = useIconImport('check');
const icon3 = useIconImport('close');
</script>

<template>
    <div class="demo-container">
        <h3 class="demo-title">Views & Slots</h3>

        <div class="demo-grid">
            <!-- Normal view -->
            <div class="demo-section">
                <h4 class="demo-section-title">Normal</h4>
                <div class="demo-section-content">
                    <Button
                        :size="size"
                        :variant="variant"
                        view="filled"
                        text="Default"
                        :disabled="disabled"
                    />
                    <Button
                        :size="size"
                        :variant="variant"
                        view="filled"
                        text="With Icon"
                        :disabled="disabled"
                    >
                        <template #leading>
                            <Icon :tag="icon1" :size="size" />
                        </template>
                    </Button>
                    <Button
                        :size="size"
                        :variant="variant"
                        view="filled"
                        :disabled="disabled"
                    >
                        <template #leading>
                            <Icon :tag="icon2" :size="size" />
                        </template>
                        Icon Both
                        <template #trailing>
                            <Icon :tag="icon3" :size="size" />
                        </template>
                    </Button>
                </div>
            </div>

            <!-- Plain view -->
            <div class="demo-section">
                <h4 class="demo-section-title">Plain</h4>
                <div class="demo-section-content">
                    <Button
                        :size="size"
                        :variant="variant"
                        view="plain"
                        text="Default"
                        :disabled="disabled"
                    />
                    <Button
                        :size="size"
                        :variant="variant"
                        view="plain"
                        text="With Icon"
                        :disabled="disabled"
                    >
                        <template #leading>
                            <Icon :tag="icon1" :size="size" />
                        </template>
                    </Button>
                    <Button
                        :size="size"
                        :variant="variant"
                        view="plain"
                        :disabled="disabled"
                    >
                        <template #leading>
                            <Icon :tag="icon2" :size="size" />
                        </template>
                        Icon Both
                        <template #trailing>
                            <Icon :tag="icon3" :size="size" />
                        </template>
                    </Button>
                </div>
            </div>

            <!-- Outlined view -->
            <div class="demo-section">
                <h4 class="demo-section-title">Outlined</h4>
                <div class="demo-section-content">
                    <Button
                        :size="size"
                        :variant="variant"
                        view="outlined"
                        text="Default"
                        :disabled="disabled"
                    />
                    <Button
                        :size="size"
                        :variant="variant"
                        view="outlined"
                        text="With Icon"
                        :disabled="disabled"
                    >
                        <template #leading>
                            <Icon :tag="icon1" :size="size" />
                        </template>
                    </Button>
                    <Button
                        :size="size"
                        :variant="variant"
                        view="outlined"
                        :disabled="disabled"
                    >
                        <template #leading>
                            <Icon :tag="icon2" :size="size" />
                        </template>
                        Icon Both
                        <template #trailing>
                            <Icon :tag="icon3" :size="size" />
                        </template>
                    </Button>
                </div>
            </div>
        </div>

        <div class="demo-info">
            Demonstrating different views with slot combinations
        </div>
    </div>
</template>
