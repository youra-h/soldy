<script lang="ts">
	/**
	 * Разметка потребителя: поведение — подсказку, ловушку фокуса — он вешает
	 * на компонент soldy attachment-ом, `{@attach}` прямо на компоненте.
	 */
	import type { Attachment } from 'svelte/attachments'
	import { Button } from '@soldy-ui/svelte'

	const { attach }: { attach: Attachment<HTMLElement> } = $props()
</script>

<Button text="Кнопка" {@attach attach} />
