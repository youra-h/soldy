<script lang="ts">
	import { Skeleton } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<Skeleton width={160} height={16} {...bind} />
