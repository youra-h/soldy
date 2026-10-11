<script lang="ts">
	import { CheckBox, Label } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!-- Подпись вокруг контрола: текст — из пропа `text` сценария, контрол — содержимым -->
<Label {...bind}>
	<CheckBox />
</Label>
