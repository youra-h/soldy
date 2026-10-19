<script lang="ts">
	import { CheckBox, Label } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Подпись — проп `text` из пропсов превью, контрол — содержимым. Строки
	страницы правят саму подпись: сторону, размер текста, вариант.
-->
<Label {...bind}>
	<CheckBox />
</Label>
