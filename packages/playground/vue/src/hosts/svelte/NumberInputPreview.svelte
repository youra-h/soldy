<script lang="ts">
	import { NumberInput } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<NumberInput {...bind} />
