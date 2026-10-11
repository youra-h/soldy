<script lang="ts">
	/**
	 * SVG-иконка приложения — компонент в `tag` у Icon: всё, что пришло
	 * пропсами, вместе с привязкой корня (attachment приходит пропом с
	 * ключом-символом) кладёт на свой корень.
	 */
	import type { SVGAttributes } from 'svelte/elements'

	const props: SVGAttributes<SVGSVGElement> = $props()
</script>

<svg viewBox="0 0 24 24" {...props}></svg>
