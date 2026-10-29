---
'@soldy-ui/react': patch
---

React: every module of the package that needs React opens with `'use client'`, so a Server Component — a page of the Next.js App Router — imports the components as they are, without wrappers. The entry stays a server module: the types and the helpers without React import into a Server Component too. A Server Component writes the parts by their flat names (`TabsItem`), not `Tabs.Item`.
