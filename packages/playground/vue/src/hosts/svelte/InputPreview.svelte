<script lang="ts">
	import { Input } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<Input placeholder="Введите текст" {...bind} />
