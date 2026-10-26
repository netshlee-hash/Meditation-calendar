/**
 * 명상센터 일정관리 웹앱 진입점.
 * Google Apps Script HtmlService 전용으로 google.script.run 이용.
 * 실행 주체로 배포할 때 비밀번호 설정과 권한 검증이 필수입니다.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('명상센터 일정관리')
    .addMetaTag('viewport','width=device-width,initial-scale=1');
}
function uiLogin(role,password) {
  return authLoginForTrustedTransport_(role,password);
}
function uiLogout(token) {
  return authLogoutForTrustedTransport_(token);
}
function uiReadMonth(token, year, month) {
  const actor=authActorForTrustedTransport_(token);
  const y=Number(year),m=Number(month);
  if(!Number.isInteger(y)||y<2020||y>2045||!Number.isInteger(m)||m<1||m>12)throw new Error('조회 날짜 오류');
  const result=readMonthForTrustedCaller_(y,m);
  return {actor:{role:actor.role},...result};
}
function uiSave(token, data, existingId) {
  const actor=authActorForTrustedTransport_(token);
  if(actor.role!=='admin')throw new Error('관리자만 일정을 편집할 수 있습니다.');
  return saveScheduleForAuthorizedCaller_(data,actor,existingId||null);
}
function uiCancel(token,id){
  const actor=authActorForTrustedTransport_(token);
  if(actor.role!=='admin')throw new Error('관리자만 일정을 취소할 수 있습니다.');
  return cancelScheduleForAuthorizedCaller_(id,actor);
}
function uiSignUpDuty(token, date, personId) {
  const actor=authActorForTrustedTransport_(token);
  if(!actor.canSignUp)throw new Error('신청 권한이 없습니다.');
  // 개인 계정이 없는 공동 비밀번호 체계: 담당자 ID를 선택해야 하며, 대리 신청 방지가 불가능합니다.
  if(!personId)throw new Error('담당자를 선택하세요.');
  const db=SpreadsheetApp.openById(SPREADSHEET_ID);
  const categories=db.getSheetByName('구분DB').getDataRange().getDisplayValues().slice(1);
  const events=db.getSheetByName('일정명DB').getDataRange().getDisplayValues().slice(1);
  const category=categories.find(r=>r[1]==='주말당번'&&r[2]==='사용');
  if(!category)throw new Error('구분DB에 주말당번을 등록해야 합니다.');
  const event=events.find(r=>r[1]===category[0]&&r[3]==='사용');
  if(!event)throw new Error('주말당번 일정명을 등록해야 합니다.');
  const s={date,categoryId:category[0],eventId:event[0],personId};
  assertEvent_(s);
  const lock=LockService.getScriptLock();lock.waitLock(25000);
  try{
    const sh=scheduleSheet_(),rows=sh.getDataRange().getDisplayValues();
    const active=rows.slice(1).filter(r=>r[1]===date&&r[4]===category[0]&&r[11]!=='취소');
    if(active.some(r=>r[6]===personId))throw new Error('이미 신청한 담당자입니다.');
    if(active.length>=2)throw new Error('해당 일요일은 2명 모두 신청했습니다.');
    const id=Utilities.getUuid(),t=new Date().toISOString();
    sh.appendRow([id,date,'','',category[0],event[0],personId,'',actor.id,t,t,'정상']);
    SpreadsheetApp.flush();
    return {ok:true,id};
  }finally{lock.releaseLock();}
}
