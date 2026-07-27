<script setup lang="ts">
import { TTabs } from '@soldy/core'
import { Tabs, TabItem } from '@soldy/ui-vue'
import type { TComponentSize, TComponentVariant } from '@soldy/core'

type Props = {
	size?: TComponentSize
	variant?: TComponentVariant
}

defineProps<Props>()

const APPEARANCES = ['line', 'contained', 'outline'] as const

const tabsInstance = new TTabs({
	items: [
		{ text: 'Users', value: 'users', active: true },
		{ text: 'Settings', value: 'settings' },
		{ text: 'Profile', value: 'profile' },
	],
})
</script>

<template>
	<div class="tabs-slots-demo">

		<!-- Closable tabs -->
		<div class="tabs-slots-demo__section">
			<h4 class="tabs-slots-demo__subtitle">Closable tabs</h4>
			<Tabs view="contained" :size="size" :variant="variant" :closable="true">
				<TabItem text="Tab 1" value="t1" active />
				<TabItem text="Tab 2" value="t2" />
				<TabItem text="Tab 3 (not closable)" value="t3" :closable="false" />
				<template #panel:t1><p>Content 1</p></template>
				<template #panel:t2><p>Content 2</p></template>
				<template #panel:t3><p>Content 3</p></template>
			</Tabs>
		</div>

	</div>
</template>

<style lang="scss" scoped>
.tabs-slots-demo {
	@apply flex flex-col gap-8;

	&__section {
		@apply flex flex-col gap-3;
	}

	&__subtitle {
		@apply text-sm font-semibold text-gray-600 uppercase tracking-wide;
	}

	&__group {
		@apply flex flex-col gap-2;
	}

	&__row {
		@apply grid grid-cols-2 gap-6;
	}

	&__col {
		@apply flex flex-col gap-2;
	}

	&__label {
		@apply text-xs text-gray-400;
	}

	&__badge {
		@apply px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs;
	}
}
</style>
