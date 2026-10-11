<script lang="ts">
	import { Label, Switch } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Текста у переключателя нет, он — голый контрол: подпись даёт обёртка Label.
	Её пропы задаёт превью, строки страницы правят контрол.
-->
<Label text="Включено">
	<Switch {...bind} />
</Label>
