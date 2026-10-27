---
'@soldy-ui/webc': patch
---

Web Components: an entry point per component — `import '@soldy-ui/webc/button'` defines just the button (with the locale provider and the elements its markup draws), so a page ships only what it uses; `import '@soldy-ui/webc'` still defines every element.
