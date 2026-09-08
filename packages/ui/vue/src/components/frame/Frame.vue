<script lang="ts">
import SetupFrame from './setup.component'

/**
 * `inheritAttrs: false` обязателен: корень шаблона — `<teleport>`, и Vue
 * считает корневым узлом именно его. Автоматический перенос атрибутов уходил
 * в телепорт и до элемента не доезжал — ни `class`, ни `data-*`, ни события.
 * Поэтому переносим вручную, на настоящий узел.
 */
export default { ...SetupFrame, inheritAttrs: false }
</script>

<template>
	<teleport :to="target">
		<component
			ref="rootElement"
			:is="tag"
			v-if="rendered"
			v-show="visible"
			:class="classes"
			:dir="dir ?? undefined"
			:style="layout_styles"
			v-bind="{ ...aria, ...$attrs }"
		>
			<slot />
		</component>
	</teleport>
</template>
