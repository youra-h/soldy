<script lang="ts">
import { Icon } from '../icon'
import SetupCheckBox from './setup.component'

export default { ...SetupCheckBox, components: { Icon } }
</script>

<template>
	<div
		ref="rootElement"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...containerAttrs }"
	>
		<input
			type="checkbox"
			:id="id"
			:checked="value"
			:indeterminate="indeterminate"
			:name="name"
			:disabled="disabled"
			:required="required"
			v-bind="{ ...aria, ...controlAttrs }"
		/>
		<div class="s-check-box__container">
			<!-- Слот для checked иконки -->
			<slot
				v-if="value && !indeterminate"
				name="icon"
				:value="value"
				:indeterminate="indeterminate"
			>
				<Icon embedded="check-box.icon" :tag="defaultIconTag" :size="size" />
			</slot>
			<!-- Слот для indeterminate иконки -->
			<slot
				v-else-if="indeterminate"
				name="indeterminate-icon"
				:value="value"
				:indeterminate="indeterminate"
			>
				<Icon
					embedded="check-box.indeterminate-icon"
					:tag="defaultIndeterminateIconTag"
					:size="size"
				/>
			</slot>
		</div>
	</div>
</template>
