<script lang="ts">
	import { Button, Icon, roleIcon } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()

	// Глифы — метками ролей: `tag` у Icon — корень, а не роль
	const CHECK = roleIcon('check')
	const ARROW_RIGHT = roleIcon('arrowRight')
</script>

<!-- Иконки по краям — подпись длинная, из пропа `text` сценария -->
<Button {...bind}>
	{#snippet leading()}<Icon tag={CHECK} />{/snippet}
	{#snippet trailing()}<Icon tag={ARROW_RIGHT} />{/snippet}
</Button>
