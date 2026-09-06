<script lang="ts">
	import { ComponentView } from '@soldy/ui-svelte'
	import PanelDemo from '../../common/PanelDemo.svelte'

	type Props = {
		visible?: boolean
		rendered?: boolean
		tag?: string
	}

	const { visible, rendered, tag }: Props = $props()
</script>

<div class="cv-slots">
	<PanelDemo title="Default Slot">
		<ComponentView {tag} {visible} {rendered} class="cv-box cv-box--violet">
			<div class="cv-box__title">Default Slot</div>
			<div class="cv-box__hint">Simple text content</div>
		</ComponentView>
	</PanelDemo>

	<PanelDemo title="Multiple Children">
		<ComponentView {tag} {visible} {rendered} class="cv-box cv-box--orange">
			<div class="cv-box__title">Multiple Children</div>
			<button class="cv-box__button">Nested button</button>
			<div class="cv-box__hint">Any markup works</div>
		</ComponentView>
	</PanelDemo>
</div>
