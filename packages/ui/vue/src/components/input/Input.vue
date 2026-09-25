<script lang="ts">
import SetupInput from './setup.component'

export default { ...SetupInput }
</script>

<template>
	<div
		ref="rootElement"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...containerAttrs }"
	>
		<div v-if="$slots.leading" class="s-input__leading">
			<slot name="leading" :ctrl="ctrl"> </slot>
		</div>
		<input
			type="text"
			:id="id"
			:value="value"
			:name="name"
			:disabled="resolvedDisabled"
			:readonly="readonly"
			:required="required"
			:placeholder="placeholder"
			v-bind="{ ...aria, ...controlAttrs }"
		/>
		<div v-if="$slots.trailing" class="s-input__trailing">
			<slot name="trailing" :ctrl="ctrl"> </slot>
		</div>
	</div>
</template>
