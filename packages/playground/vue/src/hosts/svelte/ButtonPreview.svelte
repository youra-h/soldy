<script lang="ts">
	import { Button } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Подпись — проп `text` из пропсов превью, а не слот: заданный слот
	перекрывает проп, и строка `text` не меняла бы ничего видимого.
-->
<Button {...bind} />
