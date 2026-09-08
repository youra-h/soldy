<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@soldy/ui-vue'

const props = defineProps<{ code: string; name: string }>()

const open = ref(false)
const status = ref('')

/** Endpoint пишет файл на диск, поэтому существует только при dev-сервере. */
const canOpenInEditor = import.meta.env.DEV

function flash(text: string): void {
	status.value = text
	setTimeout(() => (status.value = ''), 2000)
}

async function copy(): Promise<void> {
	try {
		await navigator.clipboard.writeText(props.code)
		flash('скопировано')
	} catch {
		flash('буфер недоступен')
	}
}

/**
 * Открыть сниппет в редакторе.
 *
 * Файл пишет dev-сервер: браузер не умеет ни записать его, ни запустить
 * редактор. Сервер кладёт сниппет внутрь воркспейса — только там разрешатся
 * алиасы на `@soldy/*`, то есть в редакторе окажется рабочий код, а не текст.
 *
 * `code -g` может не найтись (VS Code не в PATH), поэтому ответ всегда несёт
 * путь: тогда открываем через `vscode://`, этим занимается уже система.
 */
async function openInEditor(): Promise<void> {
	try {
		const response = await fetch('/__playground/open', {
			method: 'POST',
			body: JSON.stringify({ name: props.name, code: props.code }),
		})
		const { file } = (await response.json()) as { file: string }

		flash('открываю…')
		window.location.href = `vscode://file/${file.replace(/\\/g, '/')}`
	} catch {
		flash('нужен dev-сервер')
	}
}
</script>

<template>
	<div class="pg-col__foot">
		<Button view="plain" size="sm" @click="open = !open">
			{{ open ? 'Скрыть код' : 'View Code' }}
		</Button>
		<template v-if="open">
			<Button view="plain" size="sm" @click="copy">Копировать</Button>
			<Button v-if="canOpenInEditor" view="plain" size="sm" @click="openInEditor">
				Открыть в VS Code
			</Button>
		</template>
		<span class="pg-col__status">{{ status }}</span>
	</div>

	<pre v-if="open" class="pg-code">{{ code }}</pre>
</template>
