# IBM API Connect API 등록 및 배포 가이드

> **버전**: IBM API Connect 12.1.x  
> **최종 업데이트**: 2025년  
> **대상 독자**: IBM API Connect를 처음 접하거나 익숙하지 않은 사용자

---

## 목차

1. [문서 소개 및 사전 지식](#1-문서-소개-및-사전-지식)
2. [전체 프로세스 개요](#2-전체-프로세스-개요)
3. [핵심 용어 정리](#3-핵심-용어-정리)
4. [방법 1: API Manager GUI를 통한 API 등록 및 배포](#4-방법-1-api-manager-gui를-통한-api-등록-및-배포)
5. [방법 2: apic CLI를 통한 API 등록 및 배포](#5-방법-2-apic-cli를-통한-api-등록-및-배포)
6. [두 방법 비교](#6-두-방법-비교)
7. [자주 묻는 질문(FAQ)](#7-자주-묻는-질문faq)

---

## 1. 문서 소개 및 사전 지식

### 이 문서의 목적

IBM API Connect는 API를 설계, 보안, 관리, 사회화(Socialize)하는 통합 플랫폼입니다. 이 문서는 API를 API Connect에 등록하고 개발자들이 사용할 수 있도록 배포(게시)하는 **두 가지 방법**을 단계별로 안내합니다.

- **방법 1**: 웹 브라우저 기반의 **API Manager GUI** 사용 (마우스 클릭 중심, 초보자 친화적)
- **방법 2**: **apic CLI(커맨드라인 도구)** 사용 (자동화·반복 배포에 적합)

### 사전 요구사항

이 가이드를 따르기 전에 다음이 준비되어 있어야 합니다:

| 항목 | 설명 |
|------|------|
| API Connect 접근 권한 | 관리자 또는 Provider Organization 소유자/멤버 계정 |
| API Connect 서버 URL | Cloud Manager 및 API Manager의 호스트 URL |
| API 정의 파일 | OpenAPI(Swagger) 형식의 YAML 또는 JSON 파일 (방법 2의 경우) |
| 네트워크 접근 | API Connect 관리 서버에 HTTPS(443포트)로 접근 가능한 환경 |

> 💡 **초보자 팁**: 아직 API 정의 파일이 없어도 괜찮습니다. API Manager GUI에서 직접 API를 만들 수 있습니다. API 정의 파일이란 API의 엔드포인트(경로), 요청/응답 형식, 인증 방식 등을 규격화된 문서로 기술한 파일입니다.

---

## 2. 전체 프로세스 개요

### API 등록 및 배포 흐름 요약

```
[사전 준비]
    │
    ▼
① Provider Organization 확인/생성
    │  (API를 소유하고 관리하는 조직 단위)
    ▼
② Catalog 확인/생성
    │  (API를 배포하는 논리적 환경 — 예: 개발, 스테이징, 운영)
    ▼
③ API 정의 생성 또는 가져오기
    │  (OpenAPI YAML/JSON 파일로 API 명세 작성)
    ▼
④ Product 생성 및 API 포함
    │  (하나 이상의 API를 묶어 배포 단위로 구성)
    ▼
⑤ Product를 Catalog에 게시(Publish)
    │  (개발자 포털에서 API가 공개됨)
    ▼
⑥ 배포 결과 확인
       (상태: Published → 개발자가 구독 및 사용 가능)
```

### 단계별 요약표

| 단계 | 작업 | GUI | CLI |
|------|------|-----|-----|
| 1 | Provider Org 확인 | Cloud Manager | `apic orgs:list` |
| 2 | Catalog 생성 | API Manager → Manage | `apic catalogs:create` |
| 3 | API 정의 생성/가져오기 | API Manager → Develop | `apic create:api` / `apic draft-apis:create` |
| 4 | Product 생성 및 API 포함 | API Manager → Develop | `apic create:product` / `apic draft-products:create` |
| 5 | Product 게시 | API Manager → Manage | `apic products:publish` |
| 6 | 결과 확인 | API Manager → Manage | `apic products:list-all` |

---

## 3. 핵심 용어 정리

이 가이드에서 자주 등장하는 IBM API Connect 전용 용어를 미리 이해해 두면 훨씬 수월합니다.

| 용어 | 설명 |
|------|------|
| **Cloud Manager** | API Connect 플랫폼 전체를 관리하는 최상위 관리 콘솔. 인프라, Provider Org, 게이트웨이 등을 설정합니다. |
| **API Manager** | API 개발자와 관리자가 API를 설계·관리·배포하는 주요 작업 공간. GUI로 접근합니다. |
| **Provider Organization (Provider Org)** | API를 소유하고 게시하는 팀 또는 조직 단위. 예: "결제팀", "고객서비스팀". |
| **Catalog** | API가 배포되는 논리적 환경. 개발(Sandbox), 스테이징, 운영(Production) 등으로 구분합니다. API Connect 설치 시 Sandbox Catalog가 기본 생성됩니다. |
| **Space** | Catalog 내부를 다시 나누는 단위. 여러 팀이 하나의 Catalog를 독립적으로 관리할 때 사용합니다. |
| **API** | API Connect에 등록된 개별 API 정의. OpenAPI(Swagger) 스펙 기반입니다. |
| **Product** | 하나 이상의 API를 묶어 배포 단위로 구성한 것. Plan(요금제/할당량)을 포함합니다. **API는 반드시 Product에 포함되어야 Catalog에 게시됩니다.** |
| **Plan** | Product 내에서 API 사용 조건을 정의하는 단위. 예: "무제한", "시간당 100회 호출". |
| **Developer Portal (CMS Portal)** | 외부 개발자(Consumer)가 API를 검색하고 구독 신청하는 웹 포털. |
| **Consumer Organization** | API를 사용(소비)하는 개발자 조직. Developer Portal에서 구독을 통해 API에 접근합니다. |
| **Staged** | Product가 Catalog에 등록되었지만 아직 공개되지 않은 상태. |
| **Published** | Product가 Catalog에 게시되어 지정된 개발자 조직에서 접근 가능한 상태. |
| **Toolkit (apic CLI)** | API Connect의 모든 작업을 커맨드라인으로 수행할 수 있는 도구. `apic` 명령어로 사용. |

---

## 4. 방법 1: API Manager GUI를 통한 API 등록 및 배포

GUI 방식은 웹 브라우저에서 클릭과 폼 입력만으로 API를 등록하고 배포할 수 있어 처음 사용자에게 적합합니다.

### 4.1 API Manager 접속 및 로그인

**이 단계의 목적**: API를 등록하고 관리할 수 있는 작업 공간(API Manager)에 접속합니다.

#### 접속 방법

1. 웹 브라우저를 열고 API Manager URL로 접속합니다.

   ```
   https://<api-manager-hostname>/manager
   ```

   > 예시: `https://apim.mycompany.com/manager`  
   > ⚠️ 정확한 URL은 API Connect 관리자에게 문의하세요.

2. 로그인 화면이 나타나면 다음을 입력합니다:
   - **사용자명(Username)**: 부여받은 계정 이메일 또는 사용자 ID
   - **비밀번호(Password)**: 계정 비밀번호

3. **Sign In** 버튼을 클릭합니다.

4. 로그인 성공 시 **API Manager 홈 화면**이 표시됩니다.

> 💡 **팁**: 처음 로그인하면 비밀번호 변경을 요구할 수 있습니다. 화면 안내에 따라 변경하세요.

---

### 4.2 Provider Organization 및 Catalog 확인

**이 단계의 목적**: 내가 속한 조직(Provider Organization)이 존재하는지 확인하고, API를 배포할 환경(Catalog)을 준비합니다.

#### Provider Organization 확인

1. API Manager 로그인 후, 우측 상단에 현재 소속된 **Provider Organization 이름**이 표시됩니다.
2. 여러 조직에 속해 있다면, 조직 이름을 클릭하여 원하는 조직을 선택할 수 있습니다.

> ℹ️ Provider Organization은 Cloud Manager에서 생성합니다. Cloud Manager 접근 권한이 없다면 관리자에게 조직 생성을 요청하세요.

#### Catalog 확인 및 생성

**경로**: 좌측 내비게이션 메뉴 → **Manage** (카탈로그 아이콘) 클릭

1. 좌측 내비게이션의 **Manage** 아이콘(격자형 아이콘)을 클릭합니다.
2. **Catalogs** 목록이 표시됩니다. API Connect 설치 시 **Sandbox** 카탈로그가 기본으로 생성되어 있습니다.

   - **기존 Catalog 사용**: 목록에서 원하는 카탈로그 이름을 클릭합니다.
   - **새 Catalog 생성**: 아래 절차를 따릅니다.

   **새 Catalog 생성 절차**:
   1. 우측 상단의 **Add** 버튼 또는 **+** 아이콘을 클릭합니다.
   2. **Title** 필드에 카탈로그 이름을 입력합니다. (예: `production`, `staging`)
   3. **Name** 필드는 Title 입력 시 자동으로 채워집니다. (URL에 사용되는 식별자)
   4. **Create** 버튼을 클릭합니다.
   5. 생성된 Catalog가 목록에 나타납니다.

> ⚠️ **주의**: Sandbox 카탈로그는 테스트 전용입니다. 실제 운영 API는 별도의 Production 카탈로그를 생성하여 사용하세요.

---

### 4.3 API 정의 생성 또는 가져오기

**이 단계의 목적**: API Connect에 등록할 API의 명세(스펙)를 정의합니다. 이미 OpenAPI 파일이 있다면 가져오고(Import), 없다면 GUI에서 직접 만들 수 있습니다.

**경로**: 좌측 내비게이션 메뉴 → **Develop** 클릭 → **APIs** 탭

#### 옵션 A: OpenAPI 파일 가져오기 (Import)

이미 작성된 OpenAPI YAML/JSON 파일이 있는 경우:

1. **Develop** 메뉴를 클릭합니다.
2. **APIs** 탭이 선택된 상태에서 **Add** 버튼을 클릭합니다.
3. 드롭다운에서 **Import from file or URL**을 선택합니다.
4. 가져오기 방법을 선택합니다:
   - **파일 업로드**: **Browse files** 버튼으로 로컬 YAML/JSON 파일 선택
   - **URL**: OpenAPI 파일의 URL 입력 (예: `https://example.com/api/openapi.yaml`)
5. 파일을 선택한 후 **Next** 버튼을 클릭합니다.
6. 가져온 API 정보가 미리 보기로 표시됩니다. 내용을 확인한 후 **Edit API** 버튼을 클릭하면 편집 화면으로 이동합니다.

#### 옵션 B: GUI에서 새 API 직접 만들기

1. **Develop** → **APIs** 탭에서 **Add** 버튼을 클릭합니다.
2. **New API**를 선택합니다.
3. 다음 필드를 입력합니다:

   | 필드 | 설명 | 예시 |
   |------|------|------|
   | **Title** | API의 표시 이름 | `고객 정보 API` |
   | **Name** | URL에 사용되는 식별자 (자동 생성) | `customer-info-api` |
   | **Version** | API 버전 | `1.0.0` |
   | **Base Path** | API의 기본 URL 경로 | `/customers` |

4. **Create API** 버튼을 클릭합니다.
5. API 편집기 화면이 열립니다. 여기서 엔드포인트(Path), 파라미터, 응답 코드 등을 추가로 정의할 수 있습니다.
6. 모든 설정을 완료한 후 **Save** 버튼을 클릭합니다.

> 💡 **팁**: API 편집기에서 **Assemble** 탭을 클릭하면 정책(Policy)을 추가할 수 있습니다. 예를 들어 인증 정책, 속도 제한 정책 등을 드래그 앤 드롭으로 설정할 수 있습니다.

---

### 4.4 Product 생성 및 API 포함

**이 단계의 목적**: API는 단독으로 Catalog에 배포될 수 없습니다. 반드시 **Product**에 포함시켜야 합니다. Product는 API를 묶어 배포 단위로 만들고, 사용 Plan(할당량, 가격 등)을 정의합니다.

**경로**: 좌측 내비게이션 메뉴 → **Develop** 클릭 → **Products** 탭

#### 새 Product 생성

1. **Develop** 메뉴에서 **Products** 탭을 클릭합니다.
2. **Add** 버튼을 클릭하고 **New Product**를 선택합니다.
3. 다음 필드를 입력합니다:

   | 필드 | 설명 | 예시 |
   |------|------|------|
   | **Title** | Product 표시 이름 | `고객 API 패키지` |
   | **Name** | 식별자 (자동 생성) | `customer-api-package` |
   | **Version** | Product 버전 | `1.0.0` |

4. **Create Product** 버튼을 클릭합니다.

#### API를 Product에 추가

Product 편집 화면이 열리면:

1. 좌측 메뉴에서 **APIs** 섹션을 클릭합니다.
2. **Add API** 버튼을 클릭합니다.
3. 앞서 생성한 API를 목록에서 찾아 체크박스를 선택합니다.
4. **Add** 버튼을 클릭합니다.
5. 선택한 API가 Product에 포함된 것을 확인합니다.

#### Plan 설정

Product에는 최소 하나의 Plan이 있어야 합니다. 기본 Plan이 자동으로 생성되어 있으며, 필요에 따라 수정할 수 있습니다.

1. 좌측 메뉴에서 **Plans** 섹션을 클릭합니다.
2. 기본 **Default Plan**이 표시됩니다.
3. Plan 이름 옆의 **편집(연필)** 아이콘을 클릭하여 다음을 설정할 수 있습니다:
   - **Title**: Plan 이름 (예: `무료 플랜`)
   - **Rate limits**: 시간당/일당 API 호출 제한 (예: 시간당 100회)
   - **Approval required**: 구독 신청 시 승인 필요 여부
4. **Save** 버튼을 클릭합니다.

> 💡 **팁**: 여러 Plan을 만들어 사용자 등급별로 다른 호출 제한을 설정할 수 있습니다. 예를 들어 "무료 플랜(시간당 100회)"과 "프리미엄 플랜(무제한)"을 만들 수 있습니다.

---

### 4.5 Product를 Catalog에 Staging 및 게시(Publish)

**이 단계의 목적**: Product를 특정 Catalog 환경에 올려 개발자들이 접근할 수 있도록 공개합니다.

#### 방법 A: Develop 메뉴에서 직접 게시

1. **Develop** → **Products** 탭에서 게시할 Product 옆의 **⋮(더보기)** 아이콘을 클릭합니다.
2. **Publish** 메뉴를 선택합니다.
3. 게시할 **Catalog**를 선택합니다. (예: `Sandbox`, `Production`)
4. **Publish** 버튼을 클릭합니다.

#### 방법 B: Manage 메뉴에서 Staged Product를 게시

이미 Staged 상태의 Product를 게시하는 경우:

1. 좌측 내비게이션의 **Manage** 아이콘을 클릭합니다.
2. 게시할 **Catalog**를 선택합니다.
3. **Products** 탭을 클릭합니다.
4. 게시할 Product 버전 옆의 **⋮(옵션)** 아이콘을 클릭합니다.
5. **Publish**를 선택합니다.

#### 가시성(Visibility) 설정

게시 확인 화면(**Confirm Visibility Settings**)에서:

| 항목 | 옵션 | 설명 |
|------|------|------|
| **Visible to** | Public users | 누구나 포털에서 볼 수 있음 |
| **Visible to** | Authenticated users | 포털에 로그인한 사용자만 볼 수 있음 |
| **Visible to** | Custom | 특정 Consumer Organization 또는 그룹만 볼 수 있음 |
| **Subscribable by** | Public users / Authenticated / Custom | 구독 가능한 대상 범위 설정 |

6. 원하는 설정을 선택한 후 **Next** → **Confirm** 버튼을 순서대로 클릭합니다.

> ⚠️ **주의**: Catalog에서 승인(Approval) 기능이 활성화된 경우, **Pending** 상태로 전환되며 관리자의 승인 후 Published 상태가 됩니다.

---

### 4.6 배포 결과 확인

**이 단계의 목적**: Product가 성공적으로 게시되었는지 확인하고, 개발자 포털에서 API가 실제로 보이는지 검증합니다.

#### API Manager에서 상태 확인

1. **Manage** → 해당 **Catalog** 선택 → **Products** 탭을 클릭합니다.
2. Product 상태가 **Published** 로 표시되는지 확인합니다.

   | 상태 | 의미 |
   |------|------|
   | **Staged** | Catalog에 등록되었으나 아직 공개되지 않음 |
   | **Published** | 정상적으로 게시되어 개발자가 접근 가능 |
   | **Pending** | 승인 대기 중 |
   | **Deprecated** | 더 이상 신규 구독을 받지 않음 (기존 구독은 유지) |
   | **Retired** | 완전히 비활성화됨 |

#### 게이트웨이에서 API 호출 가능 여부 확인 (선택 사항)

1. **Manage** → Catalog → **Products** → 해당 Product → **APIs** 탭을 클릭합니다.
2. API 옆의 **⋮** 아이콘 → **Explorer**를 클릭하면 API 테스트 도구가 열립니다.
3. 테스트 요청을 보내 응답이 정상 반환되는지 확인합니다.

> 💡 **팁**: Developer Portal URL은 **Manage** → Catalog → **Portal** 탭에서 확인할 수 있습니다. 포털 URL로 접속하면 실제 개발자가 보는 화면을 미리 볼 수 있습니다.

---

## 5. 방법 2: apic CLI를 통한 API 등록 및 배포

CLI 방식은 터미널(명령 프롬프트)에서 명령어를 입력하여 API를 관리합니다. CI/CD 파이프라인 연동, 반복 배포, 스크립트 자동화에 적합합니다.

### 5.1 apic CLI 설치 및 환경 설정

**이 단계의 목적**: API Connect의 CLI 도구인 `apic`을 로컬 컴퓨터에 설치합니다.

#### 5.1.1 Toolkit 다운로드

**방법 A: API Manager UI에서 다운로드** (권장)

1. API Manager에 로그인합니다.
2. 홈 화면에서 **Download tools** 링크를 클릭합니다.
3. 사용 중인 운영체제에 맞는 **CLI** 파일을 클릭하여 다운로드합니다:
   - **Windows**: `apic-slim_win.zip`
   - **macOS**: `apic-slim_mac.zip`
   - **Linux**: `apic-slim_linux_amd64.tgz`
4. 동일 화면에서 **Download credentials** 옆의 **Download** 버튼을 클릭하여 `credentials.json` 파일도 함께 저장합니다.

**방법 B: IBM Fix Central에서 다운로드**

1. [IBM Fix Central](https://www-945.ibm.com/support/fixcentral/) 접속
2. 제품 선택: **IBM API Connect** → 설치된 버전 선택
3. 검색어에 `toolkit` 입력 후 해당 파일 다운로드

#### 5.1.2 파일 압축 해제 및 설정

**macOS / Linux**:

```bash
# 압축 해제
tar -xzf apic-slim_linux_amd64.tgz -C /usr/local/bin/

# 실행 권한 부여
chmod +x /usr/local/bin/apic-slim

# (선택) apic 이름으로 심볼릭 링크 생성 — 문서 예제 명령어와 동일하게 사용 가능
ln -s /usr/local/bin/apic-slim /usr/local/bin/apic

# macOS의 경우 격리 속성 제거 (필수)
sudo xattr -dr com.apple.quarantine /usr/local/bin/apic-slim
```

**Windows**:

```powershell
# 압축 해제 후 원하는 폴더에 위치 (예: C:\tools\apic\)
# 시스템 환경변수 PATH에 해당 폴더 추가 (선택 사항)
```

#### 5.1.3 Toolkit Credentials(인증 자격증명) 설치

다운로드한 `credentials.json` 파일을 CLI에 등록합니다. 이 파일은 특정 API Connect 서버와 연동되는 고유한 클라이언트 자격증명입니다.

```bash
apic client-creds:set /path/to/credentials.json
```

**예상 출력**:
```
Credentials set for server: https://mgmt.mycompany.com
```

> ⚠️ **주의**: `credentials.json`은 한 번에 하나의 관리 서버에 대해서만 유효합니다. 다른 서버에 연결할 때는 해당 서버의 credentials.json을 새로 설치해야 합니다.

#### 5.1.4 설치 확인

```bash
apic --version
```

**예상 출력**:
```
API Connect Developer Toolkit
Version: 12.1.0.4
```

---

### 5.2 로그인 및 인증

**이 단계의 목적**: CLI에서 API Connect 관리 서버에 인증하여 이후 명령어를 실행할 수 있는 상태로 만듭니다.

#### 사용 가능한 Identity Provider 목록 확인

어떤 `--realm` 값을 사용해야 하는지 모를 경우 먼저 조회합니다:

```bash
apic identity-providers:list --server <관리서버-URL> --scope provider
```

**명령어 옵션 설명**:

| 옵션 | 필수 | 설명 |
|------|------|------|
| `--server` | ✅ | API Connect 관리 서버의 FQDN 또는 URL (예: `mgmt.mycompany.com`) |
| `--scope` | ✅ | 범위 지정: `provider` (Provider Org 관리자용) 또는 `admin` (Cloud Manager 관리자용) |

**예상 출력**:
```
default-idp-2   Provider User Registry
ldap-idp        Company LDAP
```

#### 로그인

```bash
apic login \
  --server <관리서버-URL> \
  --username <사용자명> \
  --password <비밀번호> \
  --realm provider/<identity-provider-이름>
```

**실제 예시**:

```bash
apic login \
  --server mgmt.mycompany.com \
  --username alice@mycompany.com \
  --password MyP@ssw0rd \
  --realm provider/default-idp-2
```

**예상 출력**:
```
Logged into mgmt.mycompany.com successfully
```

> ⚠️ **보안 주의**: 로그인 성공 시 자격증명이 `~/.netrc` (Linux/macOS) 또는 `_netrc` (Windows) 파일에 **평문(plain text)**으로 저장됩니다. 이 파일의 접근 권한을 적절히 설정하세요 (`chmod 600 ~/.netrc`).

#### 로그아웃

```bash
apic logout --server <관리서버-URL>
```

---

### 5.3 기본 설정 변수 구성 (선택 사항이지만 강력 권장)

**이 단계의 목적**: 매번 명령어를 실행할 때마다 `--server`, `--org`, `--catalog` 옵션을 반복 입력하지 않도록 기본값을 설정합니다.

#### Catalog URI 형식

```
https://<관리서버-URL>/api/catalogs/<org-이름>/<catalog-이름>
```

#### 기본 카탈로그 설정

```bash
# 현재 프로젝트에만 적용되는 설정
apic config:set catalog=https://mgmt.mycompany.com/api/catalogs/myorg/sandbox

# 모든 프로젝트에 전역 적용되는 설정
apic config:set --global catalog=https://mgmt.mycompany.com/api/catalogs/myorg/production
```

**예상 출력**:
```
catalog: https://mgmt.mycompany.com/api/catalogs/myorg/sandbox
```

#### 설정 확인

```bash
apic config:list
```

**예상 출력**:
```
catalog=https://mgmt.mycompany.com/api/catalogs/myorg/sandbox
```

> 💡 **팁**: 이 설정이 되어 있으면 `apic products:publish myproduct.yaml`처럼 짧은 명령어로 배포할 수 있습니다. 설정이 없으면 `apic products:publish myproduct.yaml --server mgmt.mycompany.com --org myorg --catalog sandbox`처럼 모든 옵션을 명시해야 합니다.

---

### 5.4 API 정의 파일 작성 및 검증

**이 단계의 목적**: API의 명세를 YAML 파일로 작성하고, 문법적 오류가 없는지 검증합니다.

#### 5.4.1 CLI로 기본 API 정의 파일 생성

```bash
apic create:api --title "고객 정보 API" --filename customer-api.yaml
```

**명령어 옵션 설명**:

| 옵션 | 설명 |
|------|------|
| `--title` | API의 표시 이름 |
| `--filename` | 저장할 파일 이름 |

이 명령어는 기본 OpenAPI 골격 파일(`customer-api.yaml`)을 생성합니다. 생성된 파일을 텍스트 편집기로 열어 실제 경로, 파라미터, 응답 등을 정의합니다.

#### 5.4.2 API 정의 파일 예시 (customer-api.yaml)

```yaml
swagger: "2.0"
info:
  title: 고객 정보 API
  version: 1.0.0
  description: 고객 정보를 조회하고 관리하는 API
basePath: /customers
consumes:
  - application/json
produces:
  - application/json
paths:
  /:
    get:
      summary: 전체 고객 목록 조회
      operationId: listCustomers
      responses:
        "200":
          description: 고객 목록 반환 성공
  /{id}:
    get:
      summary: 특정 고객 정보 조회
      operationId: getCustomer
      parameters:
        - name: id
          in: path
          required: true
          type: string
          description: 고객 ID
      responses:
        "200":
          description: 고객 정보 반환 성공
        "404":
          description: 고객을 찾을 수 없음
x-ibm-configuration:
  gateway: datapower-api-gateway
  enforced: true
  testable: true
  cors:
    enabled: true
```

#### 5.4.3 API 정의 파일 검증

파일을 배포하기 전에 반드시 검증하여 오류를 미리 발견합니다:

```bash
apic validate customer-api.yaml
```

**예상 출력 (성공)**:
```
customer-api.yaml is valid
```

**예상 출력 (오류 발생 시)**:
```
customer-api.yaml is not valid
  Errors:
  - Missing required field: info.title (line 3)
```

> ⚠️ **오류 발생 시 해결법**: 오류 메시지에 표시된 줄 번호와 필드 이름을 확인하고 YAML 파일을 수정한 후 다시 검증하세요.

---

### 5.5 Product 정의 파일 작성

**이 단계의 목적**: API를 포함할 Product의 명세 파일을 생성합니다.

#### CLI로 Product 정의 파일 생성

```bash
apic create:product \
  --title "고객 API 패키지" \
  --name customer-api-package \
  --apis "customer-api.yaml" \
  --filename customer-product.yaml
```

**명령어 옵션 설명**:

| 옵션 | 설명 |
|------|------|
| `--title` | Product 표시 이름 |
| `--name` | Product 식별자 (URL에 사용) |
| `--apis` | 포함할 API 파일 목록 (공백으로 구분, 여러 개 가능) |
| `--filename` | 저장할 파일 이름 |

#### Product 정의 파일 예시 (customer-product.yaml)

```yaml
product: 1.0.0
info:
  name: customer-api-package
  title: 고객 API 패키지
  version: 1.0.0
apis:
  customer-api:
    $ref: customer-api.yaml
plans:
  default-plan:
    title: 기본 플랜
    description: 기본 사용 플랜 (시간당 100회 호출 제한)
    rate-limits:
      default:
        value: 100/1hour
    approval: false
visibility:
  view:
    type: public
  subscribe:
    type: authenticated
```

#### Product 정의 파일 검증

```bash
apic validate customer-product.yaml
```

**예상 출력**:
```
customer-product.yaml is valid
```

---

### 5.6 Catalog 생성 (필요한 경우)

**이 단계의 목적**: 배포할 Catalog가 아직 없다면 CLI로 생성합니다.

```bash
apic catalogs:create \
  --server mgmt.mycompany.com \
  --org myorg \
  --title "Production" \
  --name production
```

**Catalog 목록 확인**:

```bash
apic catalogs:list \
  --server mgmt.mycompany.com \
  --org myorg
```

**예상 출력**:
```
NAME        TITLE       STATUS
sandbox     Sandbox     active
production  Production  active
```

---

### 5.7 Product 게시 (Publish)

**이 단계의 목적**: 검증된 Product 파일을 대상 Catalog에 게시하여 개발자들이 API를 사용할 수 있게 합니다.

#### 기본 게시 명령어 (설정 변수 없이)

```bash
apic products:publish customer-product.yaml \
  --server mgmt.mycompany.com \
  --org myorg \
  --catalog sandbox
```

#### 기본 설정 변수가 있을 때의 간단한 게시 명령어

```bash
# catalog 변수가 이미 설정된 경우
apic products:publish customer-product.yaml
```

**예상 출력**:
```
customer-api-package:1.0.0    [state: published]
```

#### Staging 후 나중에 게시하는 방법

운영 환경에서는 바로 게시하지 않고 먼저 Staging 상태로 올린 후, 검토 후 게시하는 것이 안전합니다:

```bash
# 1단계: Staging (공개 전 준비 상태)
apic products:publish customer-product.yaml \
  --stage \
  --server mgmt.mycompany.com \
  --org myorg \
  --catalog production

# 2단계: Staged Product 게시 (API Manager GUI 또는 REST API 활용)
```

---

### 5.8 배포 상태 확인

**이 단계의 목적**: 게시된 Product와 API의 상태를 확인하여 배포가 성공적으로 완료되었는지 검증합니다.

#### Product 목록 및 상태 확인

```bash
apic products:list-all \
  --server mgmt.mycompany.com \
  --org myorg \
  --catalog sandbox \
  --scope catalog
```

**예상 출력**:
```
NAME                      VERSION  STATE      SCOPE
customer-api-package      1.0.0    published  catalog
```

#### API 목록 확인

```bash
apic apis:list-all \
  --server mgmt.mycompany.com \
  --org myorg \
  --catalog sandbox \
  --scope catalog
```

**예상 출력**:
```
NAME               VERSION  STATE
customer-info-api  1.0.0    published
```

#### 전체 CLI 워크플로우 요약 (스크립트 예시)

아래는 처음부터 끝까지 한 번에 실행할 수 있는 배포 스크립트 예시입니다:

```bash
#!/bin/bash
# API Connect 배포 자동화 스크립트

SERVER="mgmt.mycompany.com"
ORG="myorg"
CATALOG="sandbox"
REALM="provider/default-idp-2"
USERNAME="alice@mycompany.com"
PASSWORD="MyP@ssw0rd"

# 1. 로그인
echo "[1/5] API Connect 로그인 중..."
apic login \
  --server $SERVER \
  --username $USERNAME \
  --password $PASSWORD \
  --realm $REALM

# 2. 파일 검증
echo "[2/5] API 및 Product 파일 검증 중..."
apic validate customer-api.yaml
apic validate customer-product.yaml

# 3. 기본 설정 변수 지정
echo "[3/5] 기본 설정 지정..."
apic config:set catalog=https://$SERVER/api/catalogs/$ORG/$CATALOG

# 4. Product 게시
echo "[4/5] Product 게시 중..."
apic products:publish customer-product.yaml

# 5. 배포 상태 확인
echo "[5/5] 배포 상태 확인..."
apic products:list-all \
  --server $SERVER \
  --org $ORG \
  --catalog $CATALOG \
  --scope catalog

echo "배포 완료!"

# 6. 로그아웃
apic logout --server $SERVER
```

---

## 6. 두 방법 비교

| 비교 항목 | 방법 1: GUI (API Manager) | 방법 2: apic CLI |
|-----------|--------------------------|-----------------|
| **사용 편의성** | ⭐⭐⭐⭐⭐ 직관적, 마우스 클릭 | ⭐⭐⭐ 명령어 숙지 필요 |
| **초보자 적합성** | ✅ 매우 적합 | ⚠️ 사전 학습 필요 |
| **배포 속도** | ⚠️ 단계별 화면 이동 필요 | ✅ 명령어 한 줄로 실행 가능 |
| **자동화 가능성** | ❌ 수동 클릭 필요 | ✅ 스크립트화/CI-CD 연동 가능 |
| **반복 배포** | ⚠️ 매번 동일한 단계 반복 | ✅ 스크립트 재사용 가능 |
| **오류 가시성** | ✅ GUI에서 즉각 피드백 | ⚠️ 오류 메시지 해독 필요 |
| **복수 환경 배포** | ⚠️ 환경마다 반복 작업 | ✅ 변수 교체만으로 재사용 |
| **감사(Audit) 로그** | 제한적 | ✅ 스크립트 기록으로 추적 가능 |
| **네트워크 요구** | 브라우저로 접근 가능한 환경 | 터미널에서 HTTPS 접근 가능한 환경 |
| **사전 설치 필요** | 없음 (브라우저만 있으면 됨) | apic CLI 설치 필요 |
| **적합한 사용 시나리오** | - 최초 설정 및 탐색<br>- 가시성 설정 등 세밀한 조정<br>- 소규모·비정기적 배포 | - CI/CD 파이프라인 연동<br>- 다수 API 일괄 배포<br>- DevOps 환경에서의 반복 배포 |

### 권장 사항

- **처음 API Connect를 배우는 경우** → **방법 1(GUI)** 으로 시작하여 전체 흐름을 파악하세요.
- **개발팀의 지속적 배포(CD) 파이프라인 구성 시** → **방법 2(CLI)** 를 적용하여 자동화하세요.
- **두 방법을 병행** 사용하는 것이 가장 이상적입니다. GUI로 설정을 확인하고, CLI로 배포를 자동화하세요.

---

## 7. 자주 묻는 질문(FAQ)

### Q1. API를 Catalog에 직접 등록할 수 있나요? Product가 반드시 필요한가요?

**A**: 네, **Product는 필수**입니다. API Connect의 아키텍처 상 API는 단독으로 게시될 수 없으며, 반드시 Product에 포함되어야 합니다. Product는 API의 배포 단위이자 Plan(할당량/가격)을 정의하는 컨테이너입니다.

---

### Q2. 같은 API를 여러 Catalog에 배포할 수 있나요?

**A**: 네, 가능합니다. 동일한 Product 파일을 대상 Catalog만 변경하여 여러 번 게시할 수 있습니다. CLI에서는 `--catalog` 옵션 값만 변경하면 됩니다.

---

### Q3. apic login 시 `401 Unauthorized` 오류가 발생합니다.

**A**: 다음을 확인하세요:
1. `--realm` 값이 올바른지 확인 (`apic identity-providers:list`로 조회)
2. 사용자명과 비밀번호가 정확한지 확인
3. 계정이 해당 Provider Organization에 속해 있는지 관리자에게 문의
4. `credentials.json`이 올바른 서버용으로 설치되어 있는지 확인

---

### Q4. Product 게시 후 상태가 `Published`가 아닌 `Pending`으로 표시됩니다.

**A**: 해당 Catalog에서 **Product 라이프사이클 승인(Approval)** 기능이 활성화되어 있기 때문입니다. 관리자가 API Manager → Manage → Catalog → **Tasks** 탭에서 요청을 승인해야 Published 상태로 전환됩니다.

---

### Q5. OpenAPI 파일에서 `$ref`로 다른 파일을 참조하는데, 배포 시 오류가 납니다.

**A**: `apic products:publish` 또는 `apic validate` 명령어를 실행하면 `$ref`로 참조된 외부 파일의 내용이 자동으로 인라인 처리됩니다. 단, `$ref`로 참조하는 모든 파일이 **같은 폴더 또는 접근 가능한 경로**에 있어야 합니다. 없는 파일을 참조하면 오류가 발생합니다.

---

### Q6. 배포한 API를 수정하려면 어떻게 해야 하나요?

**A**: 이미 Published된 Product/API는 직접 수정이 권장되지 않습니다. 공식 권장 방법은 다음과 같습니다:
1. 새 버전(예: `1.0.1` 또는 `2.0.0`)의 API/Product를 생성합니다.
2. 새 버전을 게시합니다.
3. 기존 버전을 **Deprecated** 처리하여 신규 구독은 받지 않게 합니다.
4. 기존 구독자가 이전을 완료하면 기존 버전을 **Retire**합니다.

---

*이 문서는 IBM API Connect 12.1.x 공식 문서를 기반으로 작성되었습니다.  
최신 정보는 [IBM API Connect 공식 문서](https://www.ibm.com/docs/en/api-connect/software/12.1.1)를 참조하세요.*
