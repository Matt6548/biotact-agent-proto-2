MARTIAL TRAINING LAB — PORTABLE WINDOWS DEMO
================================================

Самый простой запуск:
1. Распакуй ZIP полностью.
2. Дважды нажми OPEN_DEMO.cmd.
3. Браузер откроет http://127.0.0.1:4173
4. Нажми Start training и разреши доступ к камере.
5. Окно "Martial Training Lab Demo Server" оставь открытым.
6. Когда закончишь — просто закрой окно сервера.

Что НЕ требуется:
- npm
- Node.js
- VS Code
- Netlify
- TinyFish
- API-ключи
- интернет для работы уже собранного demo

Нужен только Python 3 для локального сервера.

Почему запускается через localhost, а не открытием index.html:
камера, Web Worker, WASM и security headers требуют нормальный локальный web-origin.
PORTABLE_SERVER.py отдаёт те же ключевые security headers, что production-конфигурация.

Безопасность:
- камера обрабатывается локально;
- модель MediaPipe и WASM находятся внутри dist;
- runtime не должен обращаться к внешним HTTP(S) origin;
- motion trace экспортируется только вручную.

Для разработки исходников используй START_TRAINING.cmd из полного репозитория.
