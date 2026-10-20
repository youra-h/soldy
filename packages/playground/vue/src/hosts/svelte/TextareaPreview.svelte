<script lang="ts">
	import { Textarea } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<Textarea {...bind} />
