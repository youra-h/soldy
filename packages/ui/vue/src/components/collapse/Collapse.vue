<script lang="ts">
import { CollapseItem } from './collapse-item'
import SetupCollapse from './setup.component'

export default { ...SetupCollapse, components: { CollapseItem } }
</script>

<template>
	<div ref="rootRef" v-if="rendered" v-show="visible" :class="classes">
		<slot>
			<CollapseItem v-for="item in items" :key="item.uid" :ctrl="item" :view="view">
				<template #leading>
					<slot :name="`item:${item.value}:leading`" :item="item" />
				</template>
				<template #header>
					<slot :name="`item:${item.value}:header`" :item="item">
						<slot name="item" :item="item" />
					</slot>
				</template>
				<template #trailing>
					<slot :name="`item:${item.value}:trailing`" :item="item" />
				</template>
				<slot :name="`panel:${item.value}`" />
			</CollapseItem>
		</slot>
	</div>
</template>

<style lang="scss">
@use './_mixines' as mixines;
.s-collapse {
	$this: &;

	@apply flex flex-col gap-1;
}
</style>
