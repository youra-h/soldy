<script lang="ts">
import SetupInput from './setup.component'

export default { ...SetupInput }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...containerAttrs }"
	>
		<!--
			Корень рисуется по `tag`, по умолчанию `div`: `tag` — всегда тег
			корня, и по нему же ядро решает, есть ли у корня нативный
			`disabled`.
		-->
		<div v-if="$slots.leading" class="s-input__leading">
			<slot name="leading" :ctrl="ctrl"> </slot>
		</div>
		<input
			type="text"
			:id="id"
			:value="value"
			:name="name"
			:disabled="disabled"
			:readonly="readonly"
			:required="required"
			:placeholder="placeholder"
			v-bind="{ ...aria, ...controlAttrs }"
		/>
		<div v-if="$slots.trailing" class="s-input__trailing">
			<slot name="trailing" :ctrl="ctrl"> </slot>
		</div>
	</component>
</template>
