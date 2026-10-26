/**
 * 명상센터 일정관리 인증 모듈 준비본.
 * 공개 웹 API 없음. Script Properties에 비밀번호 해시와 솔트를 저장.
 * 서버 측 세션/권한 검증을 구현하며, 배포 전 UI·전송 경로 보안 검토 필요.
 */
const AUTH_ROLES_ = ['admin', 'member'];
const AUTH_SESSION_PREFIX_ = 'auth.session.';
function authDigest_(salt, password) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + ':' + password,
    Utilities.Charset.UTF_8
  );
  return Utilities.base64EncodeWebSafe(bytes);
}
function authSafeEqual_(a,b) {
  if(typeof a!=='string'||typeof b!=='string') return false;
  let diff=a.length^b.length;
  const max=Math.max(a.length,b.length);
  for(let i=0;i<max;i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);
  return diff===0;
}
function authSetPasswordForOwner_(role, password) {
  // 최초 설정 또는 변경은 스크립트 소유자가 편집기에서만 직접 실행.
  // 실제 비밀번호를 코드, GitHub, 실행 로그에 절대로 기재하지 마세요.
  if(!AUTH_ROLES_.includes(role))throw new Error('알 수 없는 역할');
  if(typeof password!=='string'||password.length<12)throw new Error('비밀번호는 12자 이상이어야 합니다.');
  const props=PropertiesService.getScriptProperties();
  const salt=Utilities.getUuid()+Utilities.getUuid();
  props.setProperties({
    ['auth.'+role+'.salt']:salt,
    ['auth.'+role+'.digest']:authDigest_(salt,password)
  });
}
function authLoginForTrustedTransport_(role,password) {
  // HTTPS 및 안전한 API 경로 확보 후에만 노출.
  if(!AUTH_ROLES_.includes(role))throw new Error('로그인 실패');
  const props=PropertiesService.getScriptProperties();
  const salt=props.getProperty('auth.'+role+'.salt');
  const expected=props.getProperty('auth.'+role+'.digest');
  if(!salt||!expected||!authSafeEqual_(authDigest_(salt,password),expected))throw new Error('로그인 실패');
  const token=Utilities.getUuid()+Utilities.getUuid();
  const now=Date.now(), ttl=60*60*1000;
  CacheService.getScriptCache().put(AUTH_SESSION_PREFIX_+token,JSON.stringify({
    id:role,role,expires:now+ttl
  }),3600);
  return {token,expiresAt:new Date(now+ttl).toISOString()};
}
function authActorForTrustedTransport_(token) {
  if(typeof token!=='string'||!/^[0-9a-f-]{72}$/.test(token))throw new Error('로그인이 필요합니다.');
  const raw=CacheService.getScriptCache().get(AUTH_SESSION_PREFIX_+token);
  if(!raw)throw new Error('로그인이 필요합니다.');
  const s=JSON.parse(raw);
  if(s.expires<Date.now())throw new Error('세션이 만료되었습니다.');
  return {id:s.id,role:s.role,canEdit:s.role==='admin',canSignUp:true};
}
function authLogoutForTrustedTransport_(token) {
  if(typeof token==='string')CacheService.getScriptCache().remove(AUTH_SESSION_PREFIX_+token);
  return {ok:true};
}
// 미구현: 로그인 시도 제한, CSRF 방어, 비밀번호 변경 시 기존 세션 무효화,
// 이메일 소유권 확인 및 비밀번호 재설정, 브라우저 요청/응답 연결.
// 본 파일을 공개 Web App으로 직접 배포하지 마세요.
