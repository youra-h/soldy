<script lang="ts">
	/**
	 * Страница гидратации: текстовое поле и многострочное со значениями. Текст
	 * сервер отдаёт атрибутом `value` у `<input>` и содержимым у `<textarea>`, а
	 * браузер — свойством узла (`fieldText`, `textareaText`). Значения сервера и
	 * гидратации — умолчания страницы; пропсами их меняет тест после гидратации
	 * (`reactiveProps`).
	 */
	import { Input, Textarea } from '@soldy-ui/svelte'

	type TPageProps = {
		/** Значение текстового поля. */
		input?: string
		/** Значение многострочного. */
		textarea?: string
	}

	const { input = 'Иван', textarea = 'Привет' }: TPageProps = $props()
</script>

<Input value={input} /><Textarea value={textarea} />
