<script setup lang="ts">
import { computed } from 'vue';
import { Tabs, TabItem, TabsContent, emitsTabs } from '@soldy/ui-vue';
import PanelDemo from '../../common/PanelDemo.vue';
import { useEventLogger } from '../../common/useEventLogger';
import type { EventLogEntry } from '../../common/EventLog.vue';
import type {
    TComponentSize,
    TComponentVariant,
    TTabsOrientation,
    TTabsAlignment,
    TTabsPosition,
    TTabsView,
} from '@soldy/core';

type Props = {
    visible?: boolean;
    rendered?: boolean;
    disabled?: boolean;
    size?: TComponentSize;
    variant?: TComponentVariant;
    orientation?: TTabsOrientation;
    alignment?: TTabsAlignment;
    position?: TTabsPosition;
    view?: TTabsView;
    closable?: boolean;
    // Tab item props
    tabDisabled?: boolean;
    tabClosable?: boolean;
    tabApplyTarget?: 'all' | 'first';
};

const props = withDefaults(defineProps<Props>(), {
    tabApplyTarget: 'first',
});

const emit = defineEmits<{
    log: [entry: EventLogEntry];
}>();

const { handlers } = useEventLogger(emit, emitsTabs);

const applyAll = computed(() => props.tabApplyTarget === 'all');
</script>

<template>
    <PanelDemo info="Props-based demo">
        <Tabs
            :visible="visible"
            :rendered="rendered"
            :disabled="disabled"
            :size="size"
            :variant="variant"
            :orientation="orientation"
            :alignment="alignment"
            :position="position"
            :view="view"
            :closable="closable"
            v-bind="handlers"
        >
            <TabItem
                text="Tab 1"
                value="tab1"
                :disabled="tabDisabled"
                :closable="tabClosable"
                active
            />
            <TabItem
                text="Tab 2"
                value="tab2"
                :disabled="applyAll ? tabDisabled : false"
                :closable="applyAll ? tabClosable : undefined"
            />
            <TabItem
                text="Tab 3"
                value="tab3"
                :disabled="applyAll ? tabDisabled : false"
                :closable="applyAll ? tabClosable : undefined"
            />
            <template #content>
            	<TabsContent value="tab1"><p>Content for Tab 1</p></TabsContent>
            	<TabsContent value="tab2"><p>Content for Tab 2</p></TabsContent>
            	<TabsContent value="tab3"><p>Content for Tab 3</p></TabsContent>
            </template>
        </Tabs>
    </PanelDemo>
</template>
