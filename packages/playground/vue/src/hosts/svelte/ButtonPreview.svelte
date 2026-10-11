<script lang="ts">
	import { Button } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Подпись — пропом `text`, а не слотом: заданный слот перекрывает проп, и
	строка `text` на странице свойств не меняла бы ничего видимого.
-->
<Button text="Кнопка" {...bind} />
