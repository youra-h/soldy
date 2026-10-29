# Установка

Продакшен-сборка чистого проекта, в который пакеты soldy поставлены так, как их ставит
пользователь: сколько весит начальная загрузка страницы, из каких пакетов она складывается и
проходит ли бюджет инструмента проекта. Здесь — стенд и методика, общие для журналов платформ
([`angular.md`](angular.md)).

## Стенд

Проекты прогона установки [`tools/install-smoke/projects`](../../tools/install-smoke/projects/)
(docs/agents/build.md, «Прогон установки»): стартовый проект официального генератора со свежими
версиями фреймворка внутри его диапазонов, библиотека — тарболлами собранных пакетов. Страница у
всех одна: кнопка `variant="accent"` открывает Dialog, рядом Input, Select трёх городов, Table из
двух строк и DatePicker; тема oren — поведение (`useTheme`) и лист темы, иконки Material
(`useIcons`).

## Методика

```bash
npm run build                                         # пакеты в dist: прогон пакует их
npm run check:install -- angular --dir <папка>        # проект в <папка>/angular: установка, типы, сборка, страница
cd <папка>/angular && npx ng build --stats-json       # та же сборка и метафайл esbuild: dist/app/browser-stats.json
node summary.mjs <папка>/angular                      # сводка — скрипт ниже
```

- **Начальная загрузка** — то, что считает бюджет `initial` Angular CLI: начальные выходы
  (`main`, глобальные стили и то, что они импортируют статически), сырые байты. Килобайт — 1000
  байт, как у бюджета: `"1MB"` — 1 000 000 байт. Рядом — gzip (9) каждого файла и оценка передачи
  из таблицы `ng build` (brotli).
- **JS по пакетам** — `bytesInOutput` входов начальных выходов JS, сложенные по пакету из пути
  `node_modules/<пакет>/…`: `@angular/*`, `@soldy-ui/angular`, `@soldy-ui/core`,
  `@soldy-ui/setup`, `@soldy-ui/plugins`, поведение темы (`./setup` пакетов `@soldy-ui/theme-oren`
  и `@soldy-ui/theme-base`), иконки (`@soldy-ui/icons-material`), `rxjs`; приложение — `src/`.
  Лист темы — отдельный выход CSS, в сводку JS он не входит.

```js
// summary.mjs <папка проекта>: начальные выходы метафайла Angular CLI и их входы по пакетам
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const dir = path.resolve(process.argv[2])
const stats = path.join(dir, 'dist/app/browser-stats.json')
const { outputs } = JSON.parse(fs.readFileSync(stats, 'utf-8'))
const initial = new Set()
const queue = Object.keys(outputs).filter((file) =>
  /src\/main\.ts$|polyfills|styles/.test(outputs[file].entryPoint ?? ''),
)

while (queue.length > 0) {
  const file = queue.shift()

  if (initial.has(file)) continue

  initial.add(file)

  for (const { path: imported, kind } of outputs[file].imports) {
    if (kind === 'import-statement') queue.push(imported)
  }
}

const packageOf = (input) => {
  const name = input.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/)?.[1]

  if (name === undefined) return input.startsWith('src/') ? 'приложение' : input
  if (name.startsWith('@angular/')) return '@angular/*'
  if (/^@soldy-ui\/theme-/.test(name)) return 'поведение темы'

  return name
}
const packages = new Map()

for (const file of initial) {
  const content = fs.readFileSync(path.join(dir, 'dist/app/browser', path.basename(file)))
  const gzip = zlib.gzipSync(content, { level: 9 }).length

  console.log(`${path.basename(file)}: ${content.length} Б, gzip ${gzip} Б`)

  if (!file.endsWith('.js')) continue

  for (const [input, { bytesInOutput }] of Object.entries(outputs[file].inputs)) {
    packages.set(packageOf(input), (packages.get(packageOf(input)) ?? 0) + bytesInOutput)
  }
}

for (const [name, bytes] of [...packages].sort((a, b) => b[1] - a[1])) {
  console.log(`${name}: ${bytes} Б`)
}
```

Внутри одного пакета метафайл не делит: адаптер Angular — один FESM, и он один вход. Раскладка
внутри — по картам кода: сборка с `sourceMap: { scripts: true, vendor: true }` (отдельная
конфигурация `angular.json` в копии проекта), байты выхода отнесены к исходнику того отображения,
с которого начинается их отрезок; карта FESM лежит в тарболле, и отображения ведут в исходники
пакета (`src/generated/…`, `src/components/…`, `src/adapter/…`). Так же — сборка проекта Vite
(`vite build --sourcemap`), когда журнал сравнивает пакеты с другим адаптером: метафайла у Vite
нет.
