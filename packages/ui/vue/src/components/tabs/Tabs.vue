<script lang="ts">
import { TabsItem } from './item'
import SetupTabs from './setup.component'

export default { ...SetupTabs, components: { TabsItem } }
</script>

<template>
	<div ref="rootElement" v-if="rendered" v-show="visible" :class="classes" :dir="dir ?? undefined">
		<div class="s-tabs__list" role="tablist">
			<div class="s-tabs__list--leading" v-if="$slots.leading">
				<slot name="leading"></slot>
			</div>
			<slot>
				<TabsItem v-for="item in items" :key="item.uid" :ctrl="item">
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
				</TabsItem>
			</slot>
			<div class="s-tabs__list--trailing" v-if="$slots.trailing">
				<slot name="trailing"></slot>
			</div>
		</div>
		<slot name="content" />
	</div>
</template>
