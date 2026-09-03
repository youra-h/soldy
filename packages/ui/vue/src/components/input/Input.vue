<script lang="ts">
import SetupInput from './setup.component'

export default { ...SetupInput }
</script>

<template>
	<div ref="rootElement" v-if="rendered" v-show="visible" :class="classes" v-bind="containerAttrs">
		<div v-if="$slots.leading" class="s-input__leading">
			<slot name="leading" :ctrl="ctrl"> </slot>
		</div>
		<input
			type="text"
			:id="ctrl.uid.toString()"
			:value="value"
			:name="name"
			:disabled="disabled"
			:readonly="readonly"
			:required="required"
			:placeholder="placeholder"
			v-bind="controlAttrs"
		/>
		<div v-if="$slots.trailing" class="s-input__trailing">
			<slot name="trailing" :ctrl="ctrl"> </slot>
		</div>
	</div>
</template>
