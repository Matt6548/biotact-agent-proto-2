# Свеча — проверенные Open Source решения: техническая разведка BOSH (23.11.2026)

## Зачем
Владелец хочет одно непрерывное упражнение, где свеча ощущается стоящей перед ним, естественно реагирует на движение кулака, а камера не становится главным экраном. Использовать **существующий Three.js + MediaPipe + локальный WebGL**. Это исследовательская записка, НЕ разрешение копировать без attribution и проверки чужого кода/ассетов.

Источник на 23 ноября 2026: GitHub REST repo metadata, деревья файлов и выборочное чтение исходников, а также официальные документы Google MediaPipe и 1€ Filter. Проведен статический обзор, НЕ выполнен benchmark этих репозиториев на Redmi Note 9S. Заявления авторов о точности/эффектах остаются неподтверждёнными у нас.

## Вероятно самое полезное («джекпот» № 1): Candle Flame Simulator
- Репозиторий: https://github.com/gddickinson/candle_flame
- Лицензия **MIT** (GitHub license field), актуальный на момент проверки код от 12.11.2026.
- Не ограничивается настольным Python/OpenGL: **имеется браузерный JavaScript/WebGL1-порт**.
- Изученные места: `candle/web/static/flame_engine.js`, `flame_noise.js`, `flame_shaders.js`, `flame_engine.test.mjs`; JS port документов и Python.
- `FlameSystem`: bounded typed arrays для pos/vel/life/size/temp; рециркуляция умерших частиц; базовая когезия near wick; вертикальное ускорение, fbm turbulence, боковое условное «wind»; температура зависит от возраста и удаления от оси; размер по кривой жизни. SmokeSystem отдельно. `flame_shaders.js`: температура → базовый цвет, прозрачность спрайта, альфа и размытие края. Это не подтверждение полной физической модели горения.
- **Что взять по идее:** температурные цвета и объёмную неоднородность, постепенное изменение формы после импульса, мягкий дым, спектр brightness и flame silhouette.
- **Не переносить напрямую:** 800 flame + 120 smoke particles из README; высокий риск CPU/fragment overdraw одновременно с on-device MediaPipe. Сперва проба 32/64/96 sprite particles либо улучшение текущего одного shader plane при 1 WebGL context. Сравнить visual impact и FPS. Не добавлять PyQt/OpenGL/новый движок.
- Отдельно проверить LICENSE, зависимые assets/notices и отсутствие копирования screenshot/изображений автора как своих.

## «Джекпот» № 2: Hand Gesture 3D
- Репозиторий: https://github.com/leonardo-carnevalli/hand-gesture-3d
- **MIT** (GitHub license metadata); исходники от 13.10.2026.
- Код: `src/input/mediapipe-adapter.ts` (зеркальная камера, handedness, нормализованные координаты), `src/gesture/one-euro.ts`, `src/gesture/engine.ts`, `src/gesture/classifier.ts`, `src/gesture/debouncer.ts`, `fixtures/*.json`, `src/gesture/*.test.ts`.
- Реальная ценность: продуманная цепочка `frame -> landmark normalization -> time-based smoothing -> detection gate -> debouncing -> action`, replayable noisy fixtures.
- **Не переносить интерфейс/Next.js/React**. Портировать только маленькие независимые функции, если наши собственные тесты на x-mirroring, frame gaps и false positives докажут пользу. Нельзя предполагать, что жест «кулак» = настоящий прямой удар.

## Полезные запасные варианты
| Проект | Лицензия по GitHub REST | Использование | Ограничение |
| --- | --- | --- | --- |
| https://github.com/Devapriyan-S/gesture-drive | MIT | `web/js/filter.js`: фильтр One Euro с обработкой dt/reset, измерение jitter/lag в отдельных синтетических сценариях | Настройки minCutoff=0.4 / beta=4 принадлежат управлению игрой, их нельзя автоматически принимать для быстрых ударов |
| https://github.com/google-ai-edge/mediapipe-samples-web | Apache-2.0 | Официальные browser examples HandLandmarker и 21 точки кисти | Модель и WASM в production должны поставляться same-origin с provenance; benchmark на Pixel 6 не равен Redmi |
| https://github.com/LucaAngioloni/SmokeGL | MIT | Старый candle-specific дым, огонь, частицы | Исходники старые (последний push 2018); не переносить устаревшую архитектуру |
| https://github.com/cpl121/fire-shader | MIT | Лёгкая shape mask и GLSL flame/smoke цвет | Это стилизованный костёр React Three Fiber; не нужен R3F в нашем проекте |
| https://github.com/Glavin001/three-realistic-vfx | MIT | Библиотека batched VFX / soft particles | Добавляет `three.quarks` + возможную depth texture / render target; прежде доказать выгоду и бюджет |
| https://github.com/mattatz/THREE.Fire | MIT | Старая volumetric procedural shader техника | Не переносить устаревший Three.js/raymarch код как есть |
| https://github.com/dgreenheck/threejs-fire-pro | MIT | Современный пример volumetric effects | WebGPU/3D GPU fluid: слишком тяжёлый и несовместимый с исходной целью телефона, только научный референс |
| https://github.com/ErencanPelin/ThreeJS-Candle-Flame-Shader | **Отсутствует лицензия в metadata** | Смотреть видео/принципы | **Запрет на копирование кода/ассетов** без разрешения |
| https://github.com/DroidNumber3/Hand_Tracking_Demo | **Отсутствует лицензия в metadata** | Сравнить UX рука+Three.js | Не переносить код без разрешения |
| https://github.com/maniic/gesture-recognition-system | **Отсутствует лицензия в metadata** | Общая идея Kalman-fusion | README говорит MIT, но статус лицензии GitHub metadata не подтверждён; подтвердить точный LICENSE прежде использования |

## Научная математическая база для CV
Официальный One Euro Filter: https://gery.casiez.net/1euro/ (Casiez, Roussel, Vogel, CHI 2012).

Для координаты x и monotonic timestamps:
- `dt=(t_i-t_{i-1})/1000` (0<dt<reasonable limit), `alpha(f,dt)=1/(1+1/(2*pi*f*dt))`.
- Оценить производную, сгладить её с `dCutoff`, выбрать `f_c=f_min + beta*|dx_filtered|`, сгладить координату с адаптивным `alpha(f_c,dt)`.
- При потере отслеживания или большом gap **reset/re-prime**, не продолжать скорость через пропуск кадров. Различать визуальное сглаживание и классификацию ударов; фильтрация не доказывает направление в глубину или силу.
- Анти-false-positive: required visible landmarks / palm confidence, min frame span, hysteresis (enter/exit), peak extension and return, cooldown, reject static fist/slow wave/handedness swap and unstable depth cues. Фактические thresholds — экспериментально, не на глаз.

Google Hand Landmarker: https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker
- Google документирует 21 hand landmarks, handedness, normalized + world coordinates, video/live modes и thresholds; аппаратная скорость зависит от модели/устройства.
- **Не рассчитывать расстояние до свечи как реальные метры** по одному RGB camera; `world` landmarks не являются глубиной, измеренной отдельным датчиком относительно объекта. «Air flow» — только игровая имитация.

## План для OGON (PR #5, потом в интеграцию)
1. Сравнить CURRENT shaders c `candle_flame` screenshot; подобрать малый flame particle budget (или 2 слоя без доп. объектов с overdraw), профиливать.
2. Дать глубину через неодинаковые по времени области температуры, ragged tip, синеватую ножку, мягкий bloom-like halo без postprocess.
3. Убрать чёрную резкую тень: мягкая освещённая подложка, контактный shadow blob и контролируемый shadow map budget. Воск подсвечен вблизи пламени, неровная поверхность.
4. Измерить mobile drawCalls, geometries, textures, DPR, p50/p95 frame time, потерю кадров во время MediaPipe. Тесты relight/dispose/visible flame.
5. Избегать тяжёлого 3D fluid engine, новых обязательных dependencies и внешних загрузок.

## План для ДВИЖЕНИЕ (PR #4, потом в интеграцию)
1. Минимальный HandLandmarker sample под текущий Pose fallback; модель same-origin + hashed provenance, worker и одна камера.
2. Исследовать first-person/hand-only framing: стоит ли требовать кулак в центре? Не заставлять человека смотреть на собственное видео. Обязательно нейтральное состояние при низкой достоверности.
3. Реализовать OneEuro (или аналог) в своём тестируемом модуле с timestamp validation/reset. Вести сравнение с существующим median filter, чтобы не ухудшить задержку.
4. Фикстуры: 1 неподвижный кулак, медленное махание, кулак приблизился и застыл, два удара подряд, одиночный ложный спайк, частичное перекрытие, смена правой/левой, mirror, длинный gap, low FPS.
5. Спрашивать у пользователя только обычное разрешение камеры; видео не отправлять, в GitHub — только синтетические fixture.

## Acceptance / release gate
- Внешние репозитории НЕ тестировались в нашем CI. Они только референсы.
- Основной UI: одна свеча; camera preview optional, no levels/registration/round gate.
- Проверить визуальную убедительность не только screenshot, но и во времени, на desktop и мобильном в реальном видео.
- Вместе с Pose/Hand провалидировать full run 5–10 минут на Redmi Note 9S, FPS, перегрев, permission/pause/stop/relaunch, no external requests. Не публиковать production без field validation.
- Если планируется копирование MIT/Apache-кода или медиа, вести `THIRD_PARTY_NOTICES.md` с ссылкой, лицензией, origin/path, изменениями и сохранением notices; `MIT` не означает отсутствия attribution obligations.
