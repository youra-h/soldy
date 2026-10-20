<script lang="ts">
	import { ProgressLinear } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Длину горизонтальной полосе даёт контейнер, своей у неё нет. Обёртка —
	граница ширины, как у ленты: сцена ячейки — флексбокс, и полоса держала бы
	там только свой минимум. Вертикальная — строчный блок своей высоты, и
	обёртка ей не мешает. По умолчанию полоса пуста: доля — ноль, а бег — флаг
	`indeterminate`.
-->
<div style="width: 100%">
	<ProgressLinear {...bind} />
</div>
