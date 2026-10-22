<script lang="ts">
	/**
	 * Страница гидратации: кнопка со стилем потребителя. Скрытой её рисует
	 * только сервер (`visible: false`): `display: none` стоит в разметке
	 * сервера, а у браузера его нет — гидратация его снимает.
	 */
	import { Button, type ButtonProps } from '@soldy-ui/svelte'

	type TPageProps = Pick<ButtonProps, 'visible'>

	const props: TPageProps = $props()
</script>

<Button text="Сохранить" style="color: red" {...props} />
