<script lang="ts">
	import { Label, RadioGroup } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Корень радио — `label`, а `label` в `label` HTML запрещает: внутри подписи
	радио рисуется с `tag="span"`. Группа вокруг — ради общего `name`.
-->
<RadioGroup>
	<Label {...bind}>
		<RadioGroup.Item value="a" tag="span" />
	</Label>
</RadioGroup>
