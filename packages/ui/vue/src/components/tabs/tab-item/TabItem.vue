<script lang="ts">
import { Icon } from '../../icon'
import { Button } from '../../button'
import SetupTabItem from './setup.component'

export default { ...SetupTabItem, components: { Icon, Button } }
</script>

<template>
	<div
		ref="rootElement"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:style="{ order: order }"
		:aria-selected="active"
		v-bind="containerAttrs"
	>
		<Button
			:disabled="disabled"
			view="none"
			:size="size"
			:variant="variant"
			@click="context.adapters.activation.active = true"
			role="tab"
			v-bind="controlAttrs"
		>
			<template #leading>
				<slot name="leading" />
			</template>

			<slot :text="text" :active="active">
				{{ text }}
			</slot>

			<template #trailing>
				<slot name="trailing" />
				<Button
					:rendered="!!tab_closable"
					class="s-tab-item__close"
					@click.stop="context?.adapters?.tabs?.close()"
					view="plain"
				>
					<slot name="close-icon">
						<Icon :tag="closeIconTag" :size="size" />
					</slot>
				</Button>
			</template>
		</Button>
	</div>
</template>
