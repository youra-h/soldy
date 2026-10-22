<script lang="ts">
	/**
	 * Страница гидратации: показанный Frame с полем в панели. `contained` —
	 * пропом: сервер и гидратация рисуют панель на месте, а после гидратации
	 * тест уводит её с места и возвращает (`reactiveProps`).
	 */
	import { Frame } from '@soldy-ui/svelte'

	type TPageProps = {
		contained: boolean
	}

	const props: TPageProps = $props()
</script>

<Frame visible contained={props.contained}><input class="so-test-field" /></Frame>
