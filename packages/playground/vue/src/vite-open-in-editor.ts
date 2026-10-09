import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
// Относительным путём, а не именем пакета: конфиг Vite выполняет Node, и пакет
// по имени ушёл бы ему исходниками TypeScript. Модуль без импортов сборщик
// конфига вкладывает в конфиг сам
import { isSnippetExtension } from '../../shared/src/snippet-file.ts'

/** Куда падают сниппеты. Внутри воркспейса — иначе не разрешатся импорты. */
const SCRATCH = path.resolve(import.meta.dirname, '../scratch')

/**
 * Endpoint «открыть сниппет в редакторе».
 *
 * Зачем сервер вообще: браузер не может ни записать файл, ни запустить
 * редактор. Он шлёт сюда текст, сервер кладёт его в `scratch/` **внутри
 * пакета** — только там сработают алиасы на `@soldy-ui/*`, то есть код в редакторе
 * будет не картинкой, а рабочим.
 *
 * Расширение файла — хоста, написавшего код (`vue`, `tsx`). Оно приходит из
 * браузера, как и имя, поэтому сервер берёт только расширения примеров
 * (`isSnippetExtension`) и других файлов не пишет.
 *
 * `code -g` может отсутствовать (VS Code не в PATH, другой редактор), поэтому
 * ответ всегда содержит путь: клиент откроет `vscode://file/...` силами ОС.
 * Плагин живёт только в dev — в статической сборке кнопки нет.
 */
export function openInEditor(): Plugin {
	return {
		name: 'soldy-open-in-editor',
		apply: 'serve',
		configureServer(server) {
			server.middlewares.use('/__playground/open', (req, res) => {
				if (req.method !== 'POST') {
					res.statusCode = 405
					res.end()

					return
				}

				let body = ''

				req.on('data', (chunk) => (body += chunk))
				req.on('end', () => {
					try {
						const { name, code, extension }: Record<string, unknown> = JSON.parse(body)

						if (typeof code !== 'string' || !isSnippetExtension(extension)) {
							throw new Error('нужны код примера и известное расширение файла')
						}

						// Имя приходит из браузера — в путь пускаем только простое
						const safe = String(name).replace(/[^\w.-]/g, '') || 'Snippet'
						const file = path.join(SCRATCH, `${safe}.${extension}`)

						mkdirSync(SCRATCH, { recursive: true })
						writeFileSync(file, code, 'utf8')

						// Ошибку запуска глотаем намеренно: файл уже записан, и клиент
						// откроет его сам по vscode://
						spawn('code', ['-g', file], { shell: true, stdio: 'ignore' }).on(
							'error',
							() => {},
						)

						res.setHeader('content-type', 'application/json')
						res.end(JSON.stringify({ file }))
					} catch (error) {
						res.statusCode = 400
						res.end(String(error))
					}
				})
			})
		},
	}
}
