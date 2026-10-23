import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { startVitest } from 'vitest/node'

/**
 * Сравнение вычисленных стилей частей soldy под двумя листами темы
 * (`packages/playground/AGENTS.md`, «Сравнение стилей»).
 *
 * ```bash
 * npm run compare:styles -- <до.css> [<после.css>] [--frameworks vue,webc] [--pages <regexp>] [--out <отчёт>]
 * ```
 *
 * «До» — копия собранного CSS темы, снятая до правки, вне отслеживаемых
 * файлов. «После» по умолчанию — нынешняя сборка темы
 * (`packages/themes/oren/dist/index.css`): перед прогоном её собирает
 * `npm run build:css --workspace=@soldy-ui/theme-oren`. Пути — от папки, из
 * которой запущен npm. Фреймворки стенда — через запятую, по умолчанию Vue и
 * Web Components; `--pages` — только страницы, чьё имя (`vue/button`)
 * подходит под выражение. Отчёт печатается в консоль и, с `--out`, пишется в
 * файл.
 *
 * Запускается Node без сборки, как `tools/min-peers/cli.ts`: типы Node снимает
 * сам. Прогон — Vitest в браузере (`vitest.styles.config.ts`), листы ему
 * отдаются текстом (`provide`): файлы вне репозитория браузеру не видны.
 */

const ROOT = resolve(import.meta.dirname, '..')
const CONFIG = resolve(ROOT, 'vitest.styles.config.ts')
const BUILT = resolve(ROOT, '../../themes/oren/dist/index.css')
const FRAMEWORKS = ['vue', 'webc']

const USAGE =
	'npm run compare:styles -- <до.css> [<после.css>] [--frameworks vue,webc] [--pages <regexp>] [--out <отчёт>]'

const { positionals, values } = parseArgs({
	allowPositionals: true,
	options: {
		frameworks: { type: 'string' },
		pages: { type: 'string' },
		out: { type: 'string' },
	},
})

// npm запускает скрипт воркспейса из его папки, а пути пишут от той, где
// набрали команду: её npm кладёт в `INIT_CWD`
const cwd = process.env.INIT_CWD ?? process.cwd()
const [before, after = BUILT, ...rest] = positionals.map((path) => resolve(cwd, path))

if (before === undefined || rest.length > 0) {
	console.error(USAGE)
	process.exit(1)
}

const out = values.out === undefined ? '' : resolve(cwd, values.out)

// Файл отчёта дописывается по странице: начинается он пустым
if (out) writeFileSync(out, '')

const vitest = await startVitest('test', [], {
	root: ROOT,
	config: CONFIG,
	watch: false,
	testNamePattern: values.pages,
	provide: {
		stylesBefore: readFileSync(before, 'utf8'),
		stylesAfter: readFileSync(after, 'utf8'),
		stylesFrameworks: values.frameworks?.split(',') ?? FRAMEWORKS,
		stylesOut: out,
	},
})

await vitest.close()
