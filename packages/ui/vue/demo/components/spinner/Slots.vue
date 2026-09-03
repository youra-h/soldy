<script setup lang="ts">
import { Spinner, Icon, useIconImport } from '@soldy/ui-vue';
import { SIZES, VARIANTS } from '../../common/items';
import type { TComponentSize, TComponentVariant } from '@soldy/core';

type Props = {
    visible?: boolean;
    rendered?: boolean;
};

const props = defineProps<Props>();

const sizes: TComponentSize[] = SIZES;
const variants: TComponentVariant[] = VARIANTS;
</script>

<template>
    <div class="sizes-demo">
        <div class="sizes-demo__title">All Sizes & Variants Demo</div>

        <!-- Grid with all sizes and variants -->
        <div class="sizes-demo__grid">
            <div class="sizes-demo__grid-header">
                <div
                    class="sizes-demo__grid-cell sizes-demo__grid-cell--header"
                >
                    Size / Variant
                </div>
                <div
                    v-for="variant in variants"
                    :key="variant"
                    class="sizes-demo__grid-cell sizes-demo__grid-cell--header"
                >
                    {{ variant }}
                </div>
            </div>

            <div v-for="size in sizes" :key="size" class="sizes-demo__grid-row">
                <div class="sizes-demo__grid-cell sizes-demo__grid-cell--label">
                    {{ size }}
                </div>
                <div
                    v-for="variant in variants"
                    :key="variant"
                    class="sizes-demo__grid-cell"
                >
                    <Spinner
                        :visible="visible"
                        :rendered="rendered"
                        :size="size"
                        :variant="variant"
                    />
                </div>
            </div>
        </div>

        <!-- Slot demo -->
        <div class="sizes-demo__slot-section">
            <div class="sizes-demo__slot-title">
                Spinner with Slot (Icon inside)
            </div>
            <div class="sizes-demo__slot-grid">
                <div
                    v-for="size in sizes"
                    :key="size"
                    class="sizes-demo__slot-item"
                >
                    <div class="sizes-demo__slot-label">{{ size }}</div>
                    <Spinner
                        :visible="visible"
                        :rendered="rendered"
                        :size="size"
                        variant="accent"
                        class="sizes-demo__spinner-with-slot"
                    >
                        <Icon
                            :tag="useIconImport('home')"
                            :size="size"
                            class="sizes-demo__slot-icon"
                        />
                    </Spinner>
                </div>
            </div>
        </div>
    </div>
</template>
