<script lang="ts">
	import { CheckBox, Label } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Текста у чекбокса нет, он — голый контрол: подпись даёт обёртка Label. Её
	пропы задаёт превью, строки страницы правят контрол.
-->
<Label text="Согласен">
	<CheckBox {...bind} />
</Label>
