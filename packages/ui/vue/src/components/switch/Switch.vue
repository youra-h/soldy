<script lang="ts">
import SetupSwitch from './setup.component'

export default { ...SetupSwitch }
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
			:name="name"
			:disabled="disabled"
			:required="required"
			:aria-checked="Boolean(value)"
			v-bind="{ ...aria, ...controlAttrs }"
		/>
		<div class="s-switch__track">
			<div class="s-switch__track--thumb">
				<transition name="fade" mode="out-in">
					<slot v-if="!value" name="off" :value="value" :ctrl="ctrl"> </slot>
					<slot v-else name="on" :value="value" :ctrl="ctrl"> </slot>
				</transition>
			</div>
		</div>
	</div>
</template>
