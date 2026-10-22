<script lang="ts">
	/**
	 * Страница гидратации: поле даты со значением и именем в форме. Расхождений
	 * у сервера и браузера нет — пропсов у страницы нет.
	 */
	import { DateInput } from '@soldy-ui/svelte'
</script>

<DateInput value="2026-05-12" name="birthday" />
