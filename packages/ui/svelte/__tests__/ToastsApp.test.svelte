<script lang="ts">
	/**
	 * Тестовая обёртка: приложение под менеджером тостов. При инициализации
	 * берёт API тостов (`useToasts()`) и отдаёт его тесту — так его берёт
	 * потомок менеджера в приложении. Без менеджера выше `useToasts()` бросает.
	 */
	import type { IToastsApi } from '@soldy-ui/core'
	import { useToasts, type TToastRender } from '@soldy-ui/svelte'

	type THarnessProps = {
		onApi?: (api: IToastsApi<TToastRender>) => void
	}

	const props: THarnessProps = $props()

	// API — при инициализации, как у потребителя; колбэк читается из замыкания,
	// лениво, как пропсы у компонентов
	const api = useToasts()
	const give = () => props.onApi?.(api)

	give()
</script>

<main class="so-test-app">Приложение</main>
