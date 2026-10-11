<script lang="ts">
	import { Icon, roleIcon } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()

	// Глиф превью — метка роли: `tag` у Icon — корень, а не роль
	const ARROW_DOWN = roleIcon('arrowDown')
</script>

<Icon tag={ARROW_DOWN} {...bind} />
