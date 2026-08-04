<script setup lang="ts">
import { Skeleton, emitsSkeleton, Button } from '@soldy/ui-vue';
import PanelDemo from '../../common/PanelDemo.vue';
import { useEventLogger } from '../../common/useEventLogger';
import type { EventLogEntry } from '../../common/EventLog.vue';
import type {
    TComponentVariant,
    TSkeletonShape,
    TSkeletonAnimation,
} from '@soldy/core';

type Props = {
    visible?: boolean;
    rendered?: boolean;
    variant?: TComponentVariant;
    shape?: TSkeletonShape;
    animation?: TSkeletonAnimation;
    width?: number | string;
    height?: number | string;
};

const props = defineProps<Props>();

const emit = defineEmits<{
    log: [entry: EventLogEntry];
}>();

const { handlers } = useEventLogger(emit, emitsSkeleton);
</script>

<template>
    <PanelDemo info="Props-based demo">
        <Skeleton
            :visible="visible"
            :rendered="rendered"
            :variant="variant"
            :shape="shape"
            :animation="animation"
            :width="width"
            :height="height"
            v-bind="handlers"
        >
            <Button>Loaded Content</Button>
        </Skeleton>
    </PanelDemo>
</template>
