# 명상센터 일정관리

[홈페이지 시안](https://netshlee-hash.github.io/Meditation-calendar/) · [구글 일정관리 DB](https://docs.google.com/spreadsheets/d/10NU46nUdNJUWoXaIGKlap69t2wkylxbU85crvfD3eXs/edit)

## 구현 상태
- `index.html`: 월간 달력, 날짜 이동, 일정 등록·수정·삭제, 일요일 당번 2명 제한. 현재 브라우저 저장소만 사용.
- `apps-script/Code.gs`: 일정DB·구분DB·일정명DB·담당자DB를 조회하는 **서버 준비 코드**. 웹앱 배포 및 연결 전.

## 실제 운영 전 필요한 작업
1. Google Apps Script 프로젝트 생성 및 웹앱 배포
2. 관리자·사용자 계정 인증, 세션 검증, 비밀번호 변경·이메일 재설정 구현
3. 서버 측 일정 등록·수정·삭제 권한 검사와 일요일 2명 제한(LockService 사용)
4. GitHub Pages에서 서버로 안전하게 요청하고 응답받는 방식 확정 및 테스트

**주의:** 공개 GitHub 저장소에 비밀번호·토큰·회원 개인정보를 올리지 마세요. 현재 버전은 로그인이나 구글 시트 자동 저장이 구현되지 않은 시험판입니다.
