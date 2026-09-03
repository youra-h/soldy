<script lang="ts">
import { ListBoxItem } from './list-box-item'
import SetupListBox from './setup.component'

export default { ...SetupListBox, components: { ListBoxItem } }
</script>

<template>
	<div
		ref="rootElement"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:aria-disabled="disabled"
		tabindex="0"
	>
		<slot name="header" />
		<slot>
			<ListBoxItem v-for="item in items" :key="item.uid" :ctrl="item">
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
			</ListBoxItem>
		</slot>
		<slot name="footer" />
	</div>
</template>
