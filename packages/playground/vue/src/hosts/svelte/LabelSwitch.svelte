<script lang="ts">
	import { Label, Switch } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!-- Подпись вокруг контрола: текст — из пропа `text` сценария, контрол — содержимым -->
<Label {...bind}>
	<Switch />
</Label>
