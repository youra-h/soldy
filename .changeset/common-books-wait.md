---
'@soldy-ui/svelte': patch
---

Адаптер Svelte уезжает сборкой в dist, а не исходниками: компоненты `.svelte` — как написаны, их компилирует приложение, модули — ESM, рядом декларации. Svelte в peerDependencies — от 5.29, где появился `{@attach}`
