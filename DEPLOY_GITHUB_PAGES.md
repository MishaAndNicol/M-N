# Деплой на GitHub Pages — инструкция

Проект уже настроен для статического экспорта и автосборки через GitHub
Actions. Осталось сделать несколько шагов на стороне GitHub.

## 1. Название репозитория

Конфиг настроен под репозиторий с именем **`M-N`** (в `next.config.ts`,
константа `REPO_NAME`). GitHub **не разрешает** символ `&` в имени
репозитория, поэтому `M&N` не подойдёт — я использовал `M-N` как ближайший
вариант.

Если создадите репозиторий с другим именем — откройте `next.config.ts` и
поменяйте одну строку:
```ts
const REPO_NAME = "ваше-название-репозитория";
```

Если сайт будет жить на `username.github.io` (репозиторий с ровно таким же
именем, как ваш GitHub-аккаунт) — basePath вообще не нужен, тогда замените
эту логику на пустую строку "" (могу поправить сам, если скажете, какой это
будет репозиторий).

## 2. Секреты для Firebase

Ключи Firebase не хранятся в репозитории (файл `.env.local` в `.gitignore`).
Чтобы GitHub Actions мог их подставить при сборке, добавьте их как секреты:

**Settings → Secrets and variables → Actions → New repository secret**

Добавьте каждый из них (значения возьмите из вашего `.env.local`):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_ADMIN_EMAIL`

Это публичные (клиентские) Firebase-ключи — они и так попадут в открытый JS
на сайте, это нормально для Firebase. Безопасность обеспечивается
Security Rules в Firebase, а не секретностью этих ключей.

## 3. Включить GitHub Pages

**Settings → Pages → Source → GitHub Actions**
(именно "GitHub Actions", не "Deploy from a branch")

## 4. Залить проект

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/M-N.git
git push -u origin main
```

После пуша откройте вкладку **Actions** в репозитории — сборка запустится
автоматически. Через 1-2 минуты сайт будет доступен по адресу:

```
https://ВАШ_ЛОГИН.github.io/M-N/
```

## Что было изменено в проекте

- `next.config.ts` — добавлен `output: "export"` (статическая сборка),
  `basePath`/`assetPrefix` под адрес GitHub Pages, `images.unoptimized: true`
  (next/image оптимизация требует сервер, на GH Pages его нет).
- `.gitignore` — добавлен (чтобы `node_modules`, `.next`, `out`, `.env.local`
  не попадали в репозиторий).
- `.github/workflows/deploy.yml` — автосборка и деплой при каждом пуше в `main`.

Раньше в проекте не было ни API routes, ни middleware, ни server actions —
весь функционал (авторизация, данные) идёт через клиентский Firebase SDK,
поэтому статический экспорт подходит без изменений в логике.
