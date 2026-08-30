<script setup lang="ts">
import { ref } from 'vue';
import {
    TTabs,
    TabsFactory,
    TCollapse,
    CollapseFactory,
    TListBox,
    ListBoxFactory,
} from '@soldy/core';
import type {
    TComponentSize,
    TComponentVariant,
    TTabsOrientation,
} from '@soldy/core';
import {
    DragAndDrop,
    Tabs,
    TabItem,
    Collapse,
    CollapseItem,
    ListBox,
    ListBoxItem,
} from '@soldy/ui-vue';

type Props = {
    orientation: TTabsOrientation;
    size?: TComponentSize;
    variant?: TComponentVariant;
};

defineProps<Props>();

// --- Вариант 1: через instance (программный) ---

const tabs = new TTabs();
tabs.variant = 'accent';
tabs.view = 'contained';
tabs.orientation = 'horizontal';

const tabsCollection = TabsFactory(tabs);
const { plain: tabsPlain, activation } = tabsCollection.extensions;

const dashboardTab = tabsPlain.push({
    text: 'Dashboard',
    value: 'dashboard',
    closable: true,
});
tabsPlain.push({ text: 'Reports', value: 'reports', closable: true });
tabsPlain.push({ text: 'Users', value: 'users' });
tabsPlain.push({ text: 'Logs', value: 'logs' });
tabsPlain.push({ text: 'Storage', value: 'storage' });
tabsPlain.push({ text: 'Config', value: 'config' });

activation.activate(dashboardTab);

// --- Вариант 2: через prop items ---

const tabItems = ref([
    { text: 'Profile', value: 'profile', closable: true },
    {
        text: 'Notifications',
        value: 'notifications',
        closable: true,
        _: { active: true },
    },
    { text: 'Security', value: 'security', closable: true },
    { text: 'Billing', value: 'billing' },
    { text: 'API Keys', value: 'api-keys', disabled: true },
]);

// --- Collapse: через instance ---

const collapse = new TCollapse();
collapse.variant = 'accent';
collapse.view = 'outlined';

const collapseCollection = CollapseFactory(collapse);
const { plain: collapsePlain, selection: collapseSelection } =
    collapseCollection.extensions;
collapseSelection.mode = 'multiple';

collapsePlain.push({ text: 'Getting Started', value: 'getting-started' });
collapsePlain.push({ text: 'Installation', value: 'installation' });
collapsePlain.push({ text: 'Configuration', value: 'configuration' });
collapsePlain.push({ text: 'Deployment', value: 'deployment' });
collapsePlain.push({ text: 'Troubleshooting', value: 'troubleshooting' });

const gettingStarted = collapsePlain.find(
    (item) => item.value === 'getting-started',
)!;
collapseSelection.select(gettingStarted);

// --- Collapse: через prop items ---

const collapseItems = ref([
    { text: 'Overview', value: 'overview', _: { selected: true } },
    { text: 'Quick Start', value: 'quick-start' },
    { text: 'API Reference', value: 'api-reference' },
    { text: 'Examples', value: 'examples' },
    { text: 'FAQ', value: 'faq' },
]);

// --- ListBox: через instance ---

const listBox = new TListBox();
listBox.variant = 'accent';
listBox.view = 'outlined';

const listBoxCollection = ListBoxFactory(listBox);
const { plain: listBoxPlain, selection: listBoxSelection } =
    listBoxCollection.extensions;
listBoxSelection.mode = 'multiple';

listBoxPlain.push({ text: 'Alpha', value: 'alpha' });
listBoxPlain.push({ text: 'Beta', value: 'beta' });
const gammaItem = listBoxPlain.push({ text: 'Gamma', value: 'gamma' });
listBoxPlain.push({ text: 'Delta', value: 'delta' });

listBoxSelection.select(gammaItem);

// --- ListBox: через prop items ---

const listBoxItems = ref([
    { text: 'One', value: 'one', _: { selected: true } },
    { text: 'Two', value: 'two' },
    { text: 'Three', value: 'three' },
]);
</script>

<template>
    <div class="drag-slots-demo">
        <p class="drag-slots-demo__hint">
            Зажмите вкладку и перетащите её в новое место. Проверьте поведение в
            горизонтальной и вертикальной ориентации.
        </p>

        <!-- Вариант 1: декларативный (TabItem в слоте) -->
        <section class="drag-slots-demo__section">
            <h3 class="drag-slots-demo__title">Declarative (TabItem slots)</h3>
            <DragAndDrop>
                <Tabs
                    :orientation="orientation"
                    :size="size"
                    :variant="variant"
                    view="line"
                >
                    <TabItem text="Overview" value="overview" active />
                    <TabItem text="Details" value="details" />
                    <TabItem text="Analytics" value="analytics" />
                    <TabItem text="History" value="history" />
                    <TabItem text="Files" value="files" />
                    <TabItem text="Settings" value="settings" />

                    <template #panel:overview><p>Overview content</p></template>
                    <template #panel:details><p>Details content</p></template>
                    <template #panel:analytics
                        ><p>Analytics content</p></template
                    >
                    <template #panel:history><p>History content</p></template>
                    <template #panel:files><p>Files content</p></template>
                    <template #panel:settings><p>Settings content</p></template>
                </Tabs>
            </DragAndDrop>
        </section>

        <!-- Вариант 2: программный (через :ctrl) -->
        <section class="drag-slots-demo__section">
            <h3 class="drag-slots-demo__title">Instance (:ctrl)</h3>
            <DragAndDrop>
                <Tabs :ctrl="tabs" :engine="tabsCollection">
                    <template #panel:dashboard
                        ><p>Dashboard content</p></template
                    >
                    <template #panel:reports><p>Reports content</p></template>
                    <template #panel:users><p>Users content</p></template>
                    <template #panel:logs><p>Logs content</p></template>
                    <template #panel:storage><p>Storage content</p></template>
                    <template #panel:config><p>Config content</p></template>
                </Tabs>
            </DragAndDrop>
        </section>

        <!-- Вариант 3: через prop :items -->
        <section class="drag-slots-demo__section">
            <h3 class="drag-slots-demo__title">Items prop (:items)</h3>
            <DragAndDrop>
                <Tabs :items="tabItems" view="outline">
                    <template #panel:profile><p>Profile content</p></template>
                    <template #panel:notifications
                        ><p>Notifications content</p></template
                    >
                    <template #panel:security><p>Security content</p></template>
                    <template #panel:billing><p>Billing content</p></template>
                    <template #panel:api-keys><p>API Keys content</p></template>
                </Tabs>
            </DragAndDrop>
        </section>

        <!-- === Collapse === -->

        <!-- Collapse: декларативный (CollapseItem в слоте) -->
        <section class="drag-slots-demo__section">
            <h3 class="drag-slots-demo__title">
                Collapse — Declarative (CollapseItem slots)
            </h3>
            <DragAndDrop>
                <Collapse mode="multiple" view="plain">
                    <CollapseItem
                        text="Introduction"
                        value="intro"
                        :selected="true"
                    >
                        <p>Introduction content</p>
                    </CollapseItem>
                    <CollapseItem text="Setup" value="setup">
                        <p>Setup content</p>
                    </CollapseItem>
                    <CollapseItem text="Usage" value="usage">
                        <p>Usage content</p>
                    </CollapseItem>
                    <CollapseItem text="Advanced" value="advanced">
                        <p>Advanced content</p>
                    </CollapseItem>
                    <CollapseItem text="Migration" value="migration">
                        <p>Migration content</p>
                    </CollapseItem>
                </Collapse>
            </DragAndDrop>
        </section>

        <!-- Collapse: программный (через :ctrl) -->
        <section class="drag-slots-demo__section">
            <h3 class="drag-slots-demo__title">Collapse — Instance (:ctrl)</h3>
            <DragAndDrop>
                <Collapse :ctrl="collapse" :engine="collapseCollection">
                    <template #panel:getting-started
                        ><p>Getting Started content</p></template
                    >
                    <template #panel:installation
                        ><p>Installation content</p></template
                    >
                    <template #panel:configuration
                        ><p>Configuration content</p></template
                    >
                    <template #panel:deployment
                        ><p>Deployment content</p></template
                    >
                    <template #panel:troubleshooting
                        ><p>Troubleshooting content</p></template
                    >
                </Collapse>
            </DragAndDrop>
        </section>

        <!-- Collapse: через prop :items -->
        <section class="drag-slots-demo__section">
            <h3 class="drag-slots-demo__title">
                Collapse — Items prop (:items)
            </h3>
            <DragAndDrop>
                <Collapse
                    :items="collapseItems"
                    mode="multiple"
                    view="outlined"
                >
                    <template #panel:overview><p>Overview content</p></template>
                    <template #panel:quick-start
                        ><p>Quick Start content</p></template
                    >
                    <template #panel:api-reference
                        ><p>API Reference content</p></template
                    >
                    <template #panel:examples><p>Examples content</p></template>
                    <template #panel:faq><p>FAQ content</p></template>
                </Collapse>
            </DragAndDrop>
        </section>

        <!-- === ListBox === -->

        <!-- ListBox: декларативный (ListBoxItem в слоте) -->
        <section class="drag-slots-demo__section">
            <h3 class="drag-slots-demo__title">
                ListBox — Declarative (ListBoxItem slots)
            </h3>
            <DragAndDrop>
                <ListBox mode="multiple" view="plain">
                    <ListBoxItem text="Item 1" value="i1" :selected="true" />
                    <ListBoxItem text="Item 2" value="i2" />
                    <ListBoxItem text="Item 3" value="i3" />
                    <ListBoxItem text="Item 4" value="i4" />
                </ListBox>
            </DragAndDrop>
        </section>

        <!-- ListBox: программный (через :ctrl) -->
        <section class="drag-slots-demo__section">
            <h3 class="drag-slots-demo__title">ListBox — Instance (:ctrl)</h3>
            <DragAndDrop>
                <ListBox :ctrl="listBox" :engine="listBoxCollection" />
            </DragAndDrop>
        </section>

        <!-- ListBox: через prop :items -->
        <section class="drag-slots-demo__section">
            <h3 class="drag-slots-demo__title">
                ListBox — Items prop (:items)
            </h3>
            <DragAndDrop>
                <ListBox
                    :items="listBoxItems"
                    mode="multiple"
                    view="outlined"
                />
            </DragAndDrop>
        </section>
    </div>
</template>

<style lang="scss" scoped>
.drag-slots-demo {
    @apply w-full;
    @apply flex flex-col gap-6;

    &__hint {
        @apply text-xs text-gray-500;
    }

    &__section {
        @apply flex flex-col gap-4;
    }

    &__title {
        @apply text-sm font-medium text-gray-600;
    }
}
</style>
