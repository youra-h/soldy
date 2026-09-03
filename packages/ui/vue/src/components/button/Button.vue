<script lang="ts">
import SetupButton from './setup.component'

export default { ...SetupButton }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:disabled="tag === 'button' ? disabled : undefined"
		:aria-disabled="tag !== 'button' ? disabled : undefined"
	>
		<slot name="leading"> </slot>
		<span class="s-button__text">
			<slot :text="text">{{ text }}</slot>
		</span>
		<slot name="trailing"> </slot>
	</component>
</template>
