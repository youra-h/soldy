<script lang="ts">
	import { CheckBox, Label } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Подпись — пропом `text`, контрол — содержимым. Строки страницы правят саму
	подпись: сторону, размер текста, вариант.
-->
<Label text="Согласен" {...bind}>
	<CheckBox />
</Label>
