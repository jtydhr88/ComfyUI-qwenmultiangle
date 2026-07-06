# ComfyUI-qwenmultiangle

**Language / 语言 / 言語 / 언어:** [English](README.md) | [中文](README_zh.md) | [日本語](README_ja.md) | [한국어](README_ko.md)

3D 카메라 각도 제어를 위한 ComfyUI 커스텀 노드입니다. 인터랙티브한 Three.js 뷰포트를 제공하여 카메라 각도를 조정하고 다중 각도 이미지 생성을 위한 포맷된 프롬프트 문자열을 출력합니다.
![img.png](img.png)
## 기능

- **인터랙티브 3D 카메라 제어** - Three.js 뷰포트에서 핸들을 드래그하여 조정:
  - 수평 각도 (방위각): 0° - 360°
  - 수직 각도 (앙각): -30° ~ 60°
  - 줌 레벨: 0 - 10
- **빠른 선택 드롭다운** - 프리셋 카메라 각도를 빠르게 선택하기 위한 3개의 드롭다운 메뉴:
  - 방위각: 정면, 쿼터 뷰, 측면, 후면
  - 앙각: 로우 앵글, 아이 레벨, 하이 앵글, 부감
  - 거리: 와이드 샷, 미디엄 샷, 클로즈업
- **실시간 미리보기** - 이미지 입력을 연결하면 올바른 색상 렌더링으로 3D 장면에 카드로 표시
- **카메라 뷰 모드** - `camera_view`를 전환하여 카메라 인디케이터의 시점에서 장면 미리보기, 인터랙티브 오빗 제어 지원 (드래그로 회전, 스크롤로 줌)
- **프롬프트 출력** - [Qwen-Image-Edit-2511-Multiple-Angles-LoRA](https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA)와 호환되는 포맷된 프롬프트 출력
- **양방향 동기화** - 슬라이더 위젯, 3D 핸들 및 드롭다운이 동기화 유지
- **다국어 지원** - UI 라벨은 영어, 중국어, 일본어 및 한국어로 제공 (ComfyUI 설정에서 자동 감지)
- **카메라 프롬프트 번역** - 선택적 동반 노드(**Qwen Multiangle Camera Translate**)가 카메라 용어를 중국어, 일본어 또는 한국어로 번역하여 영어가 아닌 기본 프롬프트와 일치시킵니다

## 설치

1. ComfyUI 커스텀 노드 폴더로 이동:
   ```bash
   cd ComfyUI/custom_nodes
   ```

2. 이 저장소를 클론:
   ```bash
   git clone https://github.com/jtydhr88/ComfyUI-qwenmultiangle.git
   ```

3. ComfyUI 재시작

4. https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA/tree/main 에서 LoRA를 다운로드하여 lora 폴더에 저장

## 개발

이 프로젝트는 프론트엔드 빌드에 Vue 3, TypeScript, Vite를 사용합니다. 3D 뷰포트는 Three.js로 구축되었습니다. 백엔드는 ComfyUI V3 노드 API를 사용합니다.

### 사전 요구 사항

- Node.js 18+
- npm

### 빌드

```bash
# 의존성 설치
npm install

# 프로덕션 빌드
npm run build

# 감시 모드로 빌드 (개발용)
npm run dev

# 타입 체크
npm run typecheck
```

### 프로젝트 구조

```
ComfyUI-qwenmultiangle/
├── src/
│   ├── main.ts                        # 익스텐션 진입점 (Vue 앱 마운트)
│   ├── App.vue                        # 루트 Vue 컴포넌트
│   ├── CameraWidget.ts               # 헤드리스 Three.js 카메라 제어 엔진
│   ├── i18n.ts                        # 국제화 (en/zh/ja/ko)
│   ├── types.ts                       # TypeScript 타입 정의
│   ├── components/
│   │   ├── SceneCanvas.vue            # Three.js 캔버스 컨테이너
│   │   └── ControlPanel.vue           # 드롭다운 컨트롤 및 값 표시
│   └── composables/
│       └── useCameraWidget.ts         # 반응형 상태 브릿지 (Vue ↔ Three.js)
├── js/                                # 빌드 출력 (배포용으로 커밋됨)
│   ├── main.js
│   └── assets/
│       └── main.css
├── nodes.py                           # ComfyUI V3 노드 정의
├── __init__.py                        # Python 모듈 초기화
├── package.json
├── tsconfig.json
└── vite.config.mts
```

## 사용 방법

1. `image/multiangle` 카테고리에서 **Qwen Multiangle Camera** 노드 추가
2. 선택 사항: 3D 장면에서 미리보기 하려면 IMAGE 입력 연결
3. 다음 방법으로 카메라 각도 조정:
   - 3D 뷰포트에서 색상 핸들 드래그
   - 슬라이더 위젯 사용
   - 드롭다운 메뉴에서 프리셋 값 선택
4. `camera_view`를 전환하여 카메라 시점에서 미리보기 확인
5. 노드는 카메라 각도를 설명하는 프롬프트 문자열 출력

### 위젯

| 위젯 | 타입 | 설명 |
|------|------|------|
| horizontal_angle | 슬라이더 | 카메라 방위각 (0° - 360°) |
| vertical_angle | 슬라이더 | 카메라 앙각 (-30° ~ 60°) |
| zoom | 슬라이더 | 카메라 거리/줌 레벨 (0 - 10) |
| default_prompts | 체크박스 | **사용 중단** - 이전 버전 호환성을 위해서만 유지, 효과 없음 |
| camera_view | 체크박스 | 카메라 시점에서 장면 미리보기 |

### 3D 뷰포트 제어

| 핸들 | 색상 | 제어 |
|------|------|------|
| 링 핸들 | 핑크 | 수평 각도 (방위각) |
| 아크 핸들 | 시안 | 수직 각도 (앙각) |
| 라인 핸들 | 골드 | 줌/거리 |

이미지 미리보기는 카드로 표시됩니다 - 정면은 이미지를 표시하고, 뒷면에서 보면 그리드 패턴이 표시됩니다.

### 카메라 뷰 모드 제어

`camera_view`가 활성화되면 마우스로 카메라를 인터랙티브하게 제어할 수 있습니다:

| 동작 | 제어 |
|------|------|
| 좌우 드래그 | 수평 회전 (방위각) |
| 상하 드래그 | 수직 회전 (앙각) |
| 위로 스크롤 | 줌 인 (거리 증가) |
| 아래로 스크롤 | 줌 아웃 (거리 감소) |

모든 인터랙션은 슬라이더와 동일한 제한을 따릅니다:
- 방위각: 0° - 360° (순환)
- 앙각: -30° ~ 60°
- 거리: 0 - 10

오빗 제어를 통한 변경 사항은 슬라이더 위젯과 자동으로 동기화됩니다.

### 빠른 선택 드롭다운

3D 뷰포트에는 프리셋 카메라 각도를 빠르게 선택하기 위한 3개의 드롭다운 메뉴가 있습니다:

| 드롭다운 | 옵션 |
|----------|------|
| 수평 (H) | 정면, 우측 전방, 우측면, 우측 후방, 후면, 좌측 후방, 좌측면, 좌측 전방 |
| 수직 (V) | 로우 앵글, 아이 레벨, 하이 앵글, 부감 |
| 거리 (Z) | 와이드 샷, 미디엄 샷, 클로즈업 |

프리셋을 선택하면 3D 핸들과 슬라이더 위젯이 자동으로 업데이트됩니다.

### 국제화

UI 라벨은 ComfyUI 언어 설정에 따라 자동으로 번역됩니다:

| 언어 | 코드 |
|------|------|
| 영어 | en |
| 중국어 (간체) | zh |
| 일본어 | ja |
| 한국어 | ko |

UI 언어에 관계없이 출력 프롬프트는 항상 영어입니다.

### 출력 프롬프트 형식

노드는 [Qwen-Image-Edit-2511-Multiple-Angles-LoRA](https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA)가 요구하는 형식으로 프롬프트를 출력합니다:

```
<sks> {방위각} {앙각} {거리}
```

예시:
- `<sks> front view eye-level shot medium shot`
- `<sks> right side view high-angle shot close-up`
- `<sks> back-left quarter view low-angle shot wide shot`

#### 지원되는 값

| 파라미터 | 값 |
|----------|-----|
| 방위각 | `front view`, `front-right quarter view`, `right side view`, `back-right quarter view`, `back view`, `back-left quarter view`, `left side view`, `front-left quarter view` |
| 앙각 | `low-angle shot` (-30°), `eye-level shot` (0°), `elevated shot` (30°), `high-angle shot` (60°) |
| 거리 | `close-up`, `medium shot`, `wide shot` |

## 카메라 프롬프트 번역 노드

카메라 노드는 항상 용어를 **영어**로 출력합니다. 기본 프롬프트가 다른 언어(예: 중국어)로 작성된 경우, 영어 카메라 용어를 추가하면 카메라 효과가 약해지거나 완전히 작동하지 않을 수 있습니다. 모델이 주변 언어와 일치하지 않는 지시를 무시하는 경향이 있기 때문입니다.

**Qwen Multiangle Camera Translate** 노드가 이를 해결합니다. 프롬프트 문자열을 받아 수동으로 관리되는 용어집을 사용하여 카메라/샷 용어*만* 대상 언어로 번역합니다. 나머지 부분 — 기본 프롬프트, `<sks>` 토큰, 문장 부호 — 은 그대로 통과합니다.

이것은 의도적으로 **독립된** 노드입니다. 원래 카메라 노드는 변경되지 않으므로 기존 워크플로우는 이전과 똑같이 작동합니다. 필요할 때만 번역 노드를 추가하세요.

### 사용 방법

1. `image/multiangle` 카테고리에서 **Qwen Multiangle Camera Translate** 노드를 추가합니다
2. **Qwen Multiangle Camera**의 `prompt` 출력을 해당 `prompt` 입력에 연결합니다 (또는 텍스트를 직접 붙여넣습니다)
3. **대상 언어**를 선택합니다
4. 번역된 출력을 텍스트 인코더에 전달합니다

일반적인 연결: `Qwen Multiangle Camera → Qwen Multiangle Camera Translate → CLIP Text Encode`

### 입력 / 출력

| 포트 | 유형 | 설명 |
|------|------|------|
| prompt (입력) | String | 카메라 용어를 포함한 프롬프트 (카메라 노드에서 연결하거나 텍스트 붙여넣기) |
| target_language | 드롭다운 | 카메라 용어의 대상 언어 |
| prompt (출력) | String | 카메라 용어가 번역된 프롬프트 |

### 대상 언어

이 README가 제공하는 언어와 일치합니다:

| 옵션 | 동작 |
|------|------|
| 中文 (Chinese) | 카메라 용어를 중국어로 번역 |
| 日本語 (Japanese) | 카메라 용어를 일본어로 번역 |
| 한국어 (Korean) | 카메라 용어를 한국어로 번역 |
| English | 패스스루 (변경 없음) |

용어집에 있는 문구만 번역됩니다. 인식되지 않는 단어는 그대로 통과합니다. 용어집은 `camera_glossary.py`에 있으며 `src/i18n.ts`의 UI 번역과 동기화되어 있어 수동으로 확장하거나 편집하기 쉽습니다.

### 예시

동일한 카메라 포즈(`front view` / `eye-level shot` / `medium shot`)를 각 대상 언어로 출력한 경우:

| 대상 | 출력 |
|------|------|
| English | `<sks> front view eye-level shot medium shot` |
| 中文 | `<sks> 正面视角 平视 中景` |
| 日本語 | `<sks> 正面 アイレベル ミディアムショット` |
| 한국어 | `<sks> 정면 아이 레벨 미디엄 샷` |

## 크레딧

### 원본 구현

이 ComfyUI 노드는 독립형 카메라 각도 제어 웹 애플리케이션인 [qwenmultiangle](https://github.com/amrrs/qwenmultiangle)을 기반으로 합니다.

원본 프로젝트는 다음에서 영감을 받았습니다:
- Hugging Face Spaces의 [multimodalart/qwen-image-multiple-angles-3d-camera](https://huggingface.co/spaces/multimodalart/qwen-image-multiple-angles-3d-camera)
- [fal.ai - Qwen Image Edit 2511 Multiple Angles](https://fal.ai/models/fal-ai/qwen-image-edit-2511-multiple-angles/)

## 관련 프로젝트

- [ComfyUI-qwenmultiangle-plus](https://github.com/cjlang2020/ComfyUI-qwenmultiangle-plus) - 이 프로젝트를 기반으로 한 또 다른 수정 버전

## 라이선스

MIT
