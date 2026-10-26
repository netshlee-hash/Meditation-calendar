/**
 * 명상센터 일정관리 - Google Apps Script 서버 준비본
 * Spreadsheet ID: 10NU46nUdNJUWoXaIGKlap69t2wkylxbU85crvfD3eXs
 * 배포 전 검토 필요: GitHub Pages와의 브라우저 요청/응답 및 인증 방식.
 * 공개 API로 배포하거나 예시 비밀번호를 사용하지 마세요.
 */
const SPREADSHEET_ID = '10NU46nUdNJUWoXaIGKlap69t2wkylxbU85crvfD3eXs';
const TABLES = {
  schedules: '일정DB', categories: '구분DB', events: '일정명DB', people: '담당자DB'
};
function getDb_() { return SpreadsheetApp.openById(SPREADSHEET_ID); }
function listRows_(tab) {
  const rows = getDb_().getSheetByName(tab).getDataRange().getValues();
  const headers = rows.shift().map(String);
  return rows.filter(r => r.some(v => v !== '')).map(row =>
    Object.fromEntries(headers.map((h,i)=>[h, row[i] instanceof Date ? row[i].toISOString() : row[i]]))
  );
}
function healthCheck() {
  return { ok:true, tables:Object.values(TABLES).map(t=>({name:t,rows:listRows_(t).length})) };
}
function readMonthForTrustedCaller_(year,month) {
  const prefix = year + '-' + String(month).padStart(2,'0');
  return {
    schedules:listRows_(TABLES.schedules).filter(r=>String(r['날짜']).slice(0,7)===prefix),
    categories:listRows_(TABLES.categories),
    events:listRows_(TABLES.events),
    people:listRows_(TABLES.people)
  };
}
// 아직 안전한 인증과 브라우저 간 통신이 연결되지 않았습니다.
// doPost / doGet를 무인증으로 공개하지 마세요.
// 웹앱 로그인, 권한 검증, 동시 신청 방지(LockService), CSRF/세션,
// 비밀번호 재설정 및 변경은 배포 전에 필수 구현 항목입니다.
