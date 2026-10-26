/**
 * 일정DB 저장 서비스 준비본.
 * 이 함수들은 서버 내부 전용이며 웹에서 직접 호출하는 doPost/doGet를 제공하지 않습니다.
 * 인증·권한·세션 검증을 갖춘 웹 API에서만 호출해야 합니다.
 */
const SCHEDULE_HEADERS = ['ID','날짜','시작시간','종료시간','구분ID','일정ID','담당자ID','상세내용','등록자','등록일시','수정일시','상태'];
function scheduleSheet_() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('일정DB');
  if (!sheet) throw new Error('일정DB 시트가 없습니다.');
  const heads = sheet.getRange(1,1,1,SCHEDULE_HEADERS.length).getDisplayValues()[0];
  if (heads.some((v,i)=>v!==SCHEDULE_HEADERS[i])) throw new Error('일정DB 열 순서가 예상과 다릅니다.');
  return sheet;
}
function assertEvent_(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s.date||''))) throw new Error('날짜 형식이 올바르지 않습니다.');
  const d = new Date(s.date+'T12:00:00+09:00');
  if (isNaN(d.getTime()) || Utilities.formatDate(d,'Asia/Seoul','yyyy-MM-dd')!==s.date) throw new Error('유효하지 않은 날짜입니다.');
  for (const t of ['start','end']) if(s[t]&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(s[t]))throw new Error('시간 형식 오류');
  if (s.start&&s.end&&s.end<=s.start) throw new Error('종료시간은 시작시간보다 늦어야 합니다.');
  if (!s.categoryId||!s.eventId) throw new Error('구분과 일정명은 필수입니다.');
  const db=SpreadsheetApp.openById(SPREADSHEET_ID);
  const get=(name)=>db.getSheetByName(name).getDataRange().getDisplayValues().slice(1);
  if (!get('구분DB').some(r=>r[0]===s.categoryId&&r[2]==='사용'))throw new Error('유효하지 않은 구분입니다.');
  if (!get('일정명DB').some(r=>r[0]===s.eventId&&r[1]===s.categoryId&&r[3]==='사용'))throw new Error('유효하지 않은 일정명입니다.');
  if(s.personId&&!get('담당자DB').some(r=>r[0]===s.personId&&r[2]==='사용'))throw new Error('유효하지 않은 담당자입니다.');
  if(s.categoryId==='C004'&&d.getUTCDay()!==0)throw new Error('일요일만 당번 신청할 수 있습니다.');
}
function saveScheduleForAuthorizedCaller_(s, actor, existingId) {
  // 호출자가 인증되어 권한 검증까지 완료된 경우에만 호출.
  // actor는 인증된 서버 세션에서 가져와야 하며 클라이언트 문자열을 신뢰하면 안 됩니다.
  if(!actor||!actor.id||!actor.canEdit)throw new Error('권한이 없습니다.');
  assertEvent_(s);
  const lock=LockService.getScriptLock();
  lock.waitLock(25000);
  try{
    const sheet=scheduleSheet_(), rows=sheet.getDataRange().getDisplayValues(), timestamp=new Date().toISOString();
    const matchIndex=existingId?rows.findIndex((r,i)=>i>0&&r[0]===existingId):-1;
    if(existingId&&matchIndex<1)throw new Error('수정할 일정을 찾을 수 없습니다.');
    if(s.categoryId==='C004'){
      const occupied=rows.slice(1).filter(r=>r[1]===s.date&&r[4]==='C004'&&r[11]!=='취소'&&r[0]!==existingId).length;
      if(occupied>=2)throw new Error('일요일 당번 정원이 2명으로 마감되었습니다.');
    }
    const id=existingId||Utilities.getUuid();
    const created=matchIndex>0?rows[matchIndex][9]:timestamp;
    const row=[id,s.date,s.start||'',s.end||'',s.categoryId,s.eventId,s.personId||'',String(s.details||'').slice(0,2000),actor.id,created,timestamp,'정상'];
    if(matchIndex>0)sheet.getRange(matchIndex+1,1,1,row.length).setValues([row]);
    else sheet.appendRow(row);
    SpreadsheetApp.flush();
    return {ok:true,id};
  } finally {lock.releaseLock();}
}
function cancelScheduleForAuthorizedCaller_(id,actor){
  if(!actor||!actor.id||!actor.canEdit)throw new Error('권한이 없습니다.');
  const lock=LockService.getScriptLock();lock.waitLock(25000);
  try{
    const sh=scheduleSheet_(),rows=sh.getDataRange().getDisplayValues(),idx=rows.findIndex((r,i)=>i>0&&r[0]===id);
    if(idx<1)throw new Error('일정을 찾을 수 없습니다.');
    sh.getRange(idx+1,12).setValue('취소');
    sh.getRange(idx+1,11).setValue(new Date().toISOString());
    return {ok:true};
  }finally{lock.releaseLock();}
}
