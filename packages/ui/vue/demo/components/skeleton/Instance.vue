<script setup lang="ts">
import { Skeleton, emitsSkeleton, Button } from '@soldy/ui-vue';
import { TSkeleton } from '@soldy/core';
import PanelDemo from '../../common/PanelDemo.vue';
import {
    useEventLogger,
    useCoreEventLogger,
} from '../../common/useEventLogger';
import { useSyncPropsToInstance } from '../../common/useSyncPropsToInstance';
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

const instance = new TSkeleton({
    rendered: props.rendered ?? true,
    visible: props.visible ?? true,
    variant: props.variant || 'normal',
    shape: props.shape || 'rect',
    animation: props.animation || 'pulse',
    width: props.width,
    height: props.height,
});

defineExpose({
    show: () => instance.show(),
    hide: () => instance.hide(),
});

const { handlers, logEvent } = useEventLogger(emit, emitsSkeleton);

useCoreEventLogger(instance, logEvent, emitsSkeleton);

useSyncPropsToInstance(props, instance);
</script>

<template>
    <PanelDemo info="Managed by TSkeleton instance">
        <Skeleton :ctrl="instance" v-bind="handlers">
            <Button>Loaded Content</Button>
        </Skeleton>
    </PanelDemo>
</template>
