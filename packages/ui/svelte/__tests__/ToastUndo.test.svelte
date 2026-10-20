<script lang="ts">
	/**
	 * Своё содержимое тоста — кнопка «Отменить»: тост приходит ей пропом
	 * `toast`, и она его закрывает. `data-uid` — какой тост она получила.
	 */
	import type { IToastsItem } from '@soldy-ui/core'

	const { toast }: { toast: IToastsItem } = $props()
</script>

<button class="so-test-undo" data-uid={toast.uid} onclick={() => toast.close()}>Отменить</button>
