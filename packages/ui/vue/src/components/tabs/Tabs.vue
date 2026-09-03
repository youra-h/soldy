<script lang="ts">
import { TabItem } from './tab-item'
import SetupTabs from './setup.component'

export default { ...SetupTabs, components: { TabItem } }
</script>

<template>
	<div ref="rootElement" v-if="rendered" v-show="visible" :class="classes">
		<div class="s-tabs__list" role="tablist">
			<div class="s-tabs__list--leading" v-if="$slots.leading">
				<slot name="leading"></slot>
			</div>
			<slot>
				<TabItem v-for="item in items" :key="item.uid" :ctrl="item">
					<template #leading>
						<slot :name="`item:${item.value}:leading`" :item="item" />
					</template>
					<template #default>
						<slot :name="`item:${item.value}`" :item="item">
							<slot name="item" :item="item" />
						</slot>
					</template>
					<template #trailing>
						<slot :name="`item:${item.value}:trailing`" :item="item" />
					</template>
				</TabItem>
			</slot>
			<div class="s-tabs__list--trailing" v-if="$slots.trailing">
				<slot name="trailing"></slot>
			</div>
		</div>
		<div v-if="activeItem && $slots[`panel:${activeItem?.value}`]" class="s-tabs__panel">
			<slot :name="`panel:${activeItem?.value}`" />
		</div>
	</div>
</template>
