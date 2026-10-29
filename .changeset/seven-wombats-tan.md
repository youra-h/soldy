---
'@soldy-ui/theme-oren': minor
---

Stylesheets per component next to the whole one: `@soldy-ui/theme-oren/<component>.css` carries the shared part — tokens, schemes, the reset and the size scales — and the parts of its component, inner ones included, and the bundler of an application puts a shared file once. Every rule of the theme moves into a cascade layer (`components`), so the CSS of an application outside layers and the utilities of its Tailwind now override the theme — drop the specificity workarounds kept against it.
