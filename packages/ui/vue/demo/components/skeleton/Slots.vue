<script setup lang="ts">
import { Skeleton, Button, CheckBox, Switch } from '@soldy/ui-vue';
import type {
    TComponentVariant,
    TSkeletonShape,
    TSkeletonAnimation,
} from '@soldy/core';

type Props = {
    visible?: boolean;
    rendered?: boolean;
};

const props = defineProps<Props>();

const variations = [
    { variant: 'normal' as TComponentVariant, shape: 'rect' as TSkeletonShape, animation: 'pulse' as TSkeletonAnimation },
    { variant: 'accent' as TComponentVariant, shape: 'rounded' as TSkeletonShape, animation: 'wave' as TSkeletonAnimation },
    { variant: 'positive' as TComponentVariant, shape: 'circle' as TSkeletonShape, animation: 'pulse' as TSkeletonAnimation },
    { variant: 'negative' as TComponentVariant, shape: 'rect' as TSkeletonShape, animation: 'wave' as TSkeletonAnimation },
    { variant: 'caution' as TComponentVariant, shape: 'rounded' as TSkeletonShape, animation: 'none' as TSkeletonAnimation },
]
const shapes: TSkeletonShape[] = ['rect', 'rounded', 'circle']
const animations: TSkeletonAnimation[] = ['pulse', 'wave', 'none']
</script>

<template>
    <div class="sizes-demo">
        <!-- Variants grid -->
        <div class="sizes-demo__section">
            <div class="sizes-demo__title">Variants (rect, pulse, w=120px, h=40px)</div>
            <div class="sizes-demo__shapes">
                <div
                    v-for="v in variations"
                    :key="v.variant"
                    class="sizes-demo__shape-item"
                >
                    <div class="sizes-demo__shape-label">{{ v.variant }}</div>
                    <Skeleton
                        :visible="visible"
                        :rendered="rendered"
                        :variant="v.variant"
                        :shape="v.shape"
                        :animation="v.animation"
                        width="120px"
                        height="40px"
                    />
                </div>
            </div>
        </div>

        <!-- Shapes -->
        <div class="sizes-demo__section">
            <div class="sizes-demo__title">
                Shapes (accent, pulse, width=64px, height=64px)
            </div>
            <div class="sizes-demo__shapes">
                <div
                    v-for="shape in shapes"
                    :key="shape"
                    class="sizes-demo__shape-item"
                >
                    <div class="sizes-demo__shape-label">{{ shape }}</div>
                    <Skeleton
                        :visible="visible"
                        :rendered="rendered"
                        variant="accent"
                        :shape="shape"
                        animation="pulse"
                        width="64px"
                        height="64px"
                    />
                </div>
            </div>
        </div>

        <!-- Animations -->
        <div class="sizes-demo__section">
            <div class="sizes-demo__title">
                Animations (normal, rect, width=200px, height=32px)
            </div>
            <div class="sizes-demo__shapes">
                <div
                    v-for="anim in animations"
                    :key="anim"
                    class="sizes-demo__shape-item"
                >
                    <div class="sizes-demo__shape-label">{{ anim }}</div>
                    <Skeleton
                        :visible="visible"
                        :rendered="rendered"
                        variant="normal"
                        shape="rect"
                        :animation="anim"
                        width="200px"
                        height="32px"
                    />
                </div>
            </div>
        </div>

        <!-- Slot demo: skeleton wraps real components -->
        <div class="sizes-demo__section">
            <div class="sizes-demo__title">
                Skeleton wraps real components (visible=true → skeleton shown)
            </div>
            <div class="sizes-demo__slot-grid">
                <div class="sizes-demo__slot-item">
                    <div class="sizes-demo__slot-label">Button</div>
                    <Skeleton
                        :visible="visible"
                        :rendered="rendered"
                        variant="accent"
                        shape="rounded"
                        animation="wave"
                        width="120px"
                        height="40px"
                    >
                        <Button variant="accent">Click Me</Button>
                    </Skeleton>
                </div>
                <div class="sizes-demo__slot-item">
                    <div class="sizes-demo__slot-label">CheckBox</div>
                    <Skeleton
                        :visible="visible"
                        :rendered="rendered"
                        variant="positive"
                        shape="circle"
                        animation="pulse"
                    >
                        <CheckBox>Accept terms</CheckBox>
                    </Skeleton>
                </div>
                <div class="sizes-demo__slot-item">
                    <div class="sizes-demo__slot-label">Switch</div>
                    <Skeleton
                        :visible="visible"
                        :rendered="rendered"
                        variant="caution"
                        shape="rounded"
                        animation="wave"
                    >
                        <Switch>Enable feature</Switch>
                    </Skeleton>
                </div>
            </div>
        </div>
    </div>
</template>
