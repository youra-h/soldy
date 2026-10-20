<script lang="ts">
	import type { IToastsItem } from '@soldy-ui/core'
	import { Button } from '@soldy-ui/svelte'

	const { toast }: { toast: IToastsItem } = $props()
</script>

<!-- Своё содержимое тоста — кнопка «Отменить»: тост приходит ей пропом и закрывается ею -->
<Button text="Отменить" onclick={() => toast.close()} />
