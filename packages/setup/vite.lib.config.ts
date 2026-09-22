// Расширение обязательно: с ним конфиг читает и нативный загрузчик Vite
import { libConfig } from '../../tools/vite/lib.config.ts'

/**
 * Библиотечная сборка @soldy-ui/setup: описание компонента, его сборка на
 * монтирование и обмен с фреймворком.
 *
 * Исходники лежат в корне пакета (`index.ts`, `protected/`, `content/`), а не в
 * `src/`: у пакета два слоя, и папка `src` добавила бы к ним третий уровень ни
 * о чём. Декларации собирает `tsc -p tsconfig.build.json` вторым шагом `build`.
 */
export default libConfig({
	name: '@soldy-ui/setup',
	root: import.meta.dirname,
	entry: 'index.ts',
})
