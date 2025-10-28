## Подготовка и старт проекта для автотестов на Playwright 

### Шаги перед запуском:

### Шаг 1 - Инсталяция проекта

```bash
npm init playwright@latest --force
```

Эта команда запускает **официальный установщик Playwright**, который создаёт локальную структуру проекта, добавляет зависимости и конфигурационные файлы для начала автоматизированного тестирования.

---

### 1 - Структура проекта 

```bash
Ваш проект/
├── .auth/           # Папка для хранения состояния аутентификации
│   └── user.json     # Автоматически создаваемый файл с сессией
├── tests/
│   ├── auth.setup.ts   # Setup-тест для аутентификации
│   └── conduitTestAPI.spec.ts # Основные тесты
├── playwright.config.ts    # Конфигурация Playwright
└── .gitignore            # Исключает .auth/ из Git
```

---

### 2 - HOOK и мокирование API:

- HOOK: Что происходит в beforeEach:
- МОКИРОВАНИЕ API: Перехватывается запрос к /api/tags
- Возвращаются моковые данные из JSON файла (подмена тегов)
и только после этого:
- Открывается сайт - уже с подмененными тегами

```bash
test.beforeEach(async ({page}) => {
  await page.route('*/**/api/tags', async route => {
    await route.fulfill({
      body: JSON.stringify(tags) 
    })
  })
  await page.goto('https://conduit.bondaracademy.com/')
})
```

---

### 3 - Файл auth.setup.ts - Система аутентификации

- Один раз выполняет вход в систему
- Сохраняет состояние сессии (cookies, localStorage)
- Предоставляет токен для API запросов

```bash
import { test as setup } from '@playwright/test';
import user from '../.auth/user.json' # импорт для модификации
import fs from 'fs'

const authFile = '.auth/user.json'
```

ШАГ 1: API ЗАПРОС ДЛЯ ЛОГИНА

```bash
setup('authentication', async({request}) => {
  const response = await request.post('https://conduit-api.bondaracademy.com/api/users/login', {
    data: {
      user: {email: "mas@mas.com", password: "7maza7697"}
    }
  })
})
```

ШАГ 2: ПОЛУЧЕНИЕ ТОКЕНА ИЗ ОТВЕТА

```bash
  const responseBody = await response.json()
  const accessToken = responseBody.user.token  # получение токена
```

ШАГ 3: РУЧНОЕ ОБНОВЛЕНИЕ ФАЙЛА СЕССИИ

```bash
  user.origins[0].localStorage[0].value = accessToken 
  fs.writeFileSync(authFile, JSON.stringify(user)) 
```

ШАГ 4: СОХРАНЕНИЕ ТОКЕНА ДЛЯ CONFIG

```bash
  process.env['ACCESS_TOKEN'] = accessToken
})
```

---

### 3 - Файл auth.setup.ts - Система аутентификации

- Хранит состояние аутентификации между тестами
- Содержит cookies, localStorage, sessionStorage

- !!! Структура файла (генерируется автоматически)

---

### 4 - Файл playwright.config.ts - Конфигурация

- Настраивает выполнение тестов
- Определяет зависимости между проектами
- Настраивает заголовки авторизации

```bash
use: {
  extraHTTPHeaders: {
		# Для API запросов
    'Authorization': `Token ${process.env.ACCESS_TOKEN}` 
  }
},

projects: [
  # ПРОЕКТ 1: SETUP (выполняется ПЕРВЫМ)
  {
    name: 'setup',
    testMatch: 'auth.setup.ts'  // Только этот файл
  },
  
  # ПРОЕКТ 2: ОСНОВНЫЕ ТЕСТЫ (зависит от setup)
  {
    name: 'chromium',
    use: { 
      ...devices['Desktop Chrome'],
      storageState: '.auth/user.json' # Автоматическая аутентификация
    },
		# Ждет завершения setup
    dependencies: ['setup']  
  }
]
```

### 5 Заметки:

fs - это File System (Файловая Система) - встроенный модуль Node.js для работы с файлами.

- fs - это как "Проводник" в Windows или "Finder" в Mac
- Он умеет: читать файлы, писать файлы, удалять файлы

```bash
fs.writeFileSync(authFile, JSON.stringify(user))
```

Перевод: "Запиши в файл authFile содержимое объекта user в формате JSON"

---

process.env - это глобальный объект в Node.js, который содержит переменные окружения.

- Это как "Общие настройки" для всей программы
- Как "Переменные" в математике: x = 5

--- 

ВИЗУАЛИЗАЦИЯ ПРОЦЕССА:
article.setup.ts (создание статьи):

```bash
# 1. Создаем статью через API
const article = создатьСтатью("Likes test article")

# 2. Получаем ID статьи  
const articleId = article.id # "статья-123"

# 3. Кладем ID в ОБЩУЮ КОРОБКУ
ОБЩАЯ_КОРОБКА['SLUGID'] = "статья-123"
```


articleCleanUp.setup.ts (удаление статьи):

```bash
# 1. Достаем ID из ОБЩЕЙ КОРОБКИ
const articleId = ОБЩАЯ_КОРОБКА['SLUGID'] // "статья-123"

# 2. Удаляем статью по этому ID
удалитьСтатью("статья-123")
```
Где ОБЩАЯ_КОРОБКА = process.env

---

### 6. Проблемы в Global Setup and Teardown (#70):

При запуске тестов из панели Playwright статья создается в `global-setup.ts`, но не удаляется в `global-teardown.ts`.

**Решение 1 (ручное через тестовую панель Playwright):**
- В `Setup` активировать `Run global setup` перед запуском тестов
- После первого запуска тестов переключить на `Run global teardown` 
- Обновить браузер

**Решение 2 (приоритетное - запуск тестов через терминал):**

```bash
npx playwright test likesCounterGlobal.spec.ts --reporter=list
```

---

### Последовательность выполнения

- При запуске npx playwright test:

1. Запускается проект setup:
	- Выполняется auth.setup.ts
	- Делает API запрос для логина
	- Сохраняет токен в user.json и process.env
	- Выходные данные: .auth/user.json + ACCESS_TOKEN

2. Запускаются основные проекты (параллельно):
	- chromium, firefox, webkit
	- Каждый получает storageState: '.auth/user.json'
	- Результат: Все тесты начинаются УЖЕ АУТЕНТИФИЦИРОВАННЫМИ

3. Выполняются тесты из conduitTestAPI.spec.ts:
	- beforeEach настраивает моки для каждого теста
	- Тесты используют готовую аутентификацию
	- API запросы автоматически получают заголовки авторизации