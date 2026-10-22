<script lang="ts">
	/**
	 * Страница гидратации: DatePicker со значением и именем в форме. Панели на
	 * сервере нет — её рисует браузер после гидратации. Расхождений у сервера и
	 * браузера нет — пропсов у страницы нет.
	 */
	import { DatePicker } from '@soldy-ui/svelte'
</script>

<DatePicker value="2026-09-10" name="trip" />
