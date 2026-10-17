// 승인 코드 관리(2026-10-17). access.json은 비공개 저장소에만 두고 공개 저장소로 내보내지 않는다.
//   node src/tools/access.js add "이름"     → 새 코드 발급(화면에 출력)
//   node src/tools/access.js remove "이름"  → 그 사람 코드 취소(다시 빌드·배포해야 반영)
//   node src/tools/access.js set "이름" 코드 → 정해진 코드로(새 세션에서 같은 비밀번호를 다시 넣을 때)
//   node src/tools/access.js list
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ACC = process.env.ACCESS || path.join(__dirname, '..', '..', 'access.json');
const load = () => fs.existsSync(ACC) ? JSON.parse(fs.readFileSync(ACC, 'utf8')) : {users: []};
const save = d => fs.writeFileSync(ACC, JSON.stringify(d, null, 1) + '\n');
const AL = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // 헷갈리는 0·O·1·I·L 뺌
const code = () => { const b = crypto.randomBytes(12); let s = ''; for (let i = 0; i < 12; i++) s += AL[b[i] % AL.length]; return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8); };
const [cmd, name] = process.argv.slice(2), d = load();
if (cmd === 'add' && name) {
  if (d.users.some(u => u.name === name)) { console.error('이미 있는 이름입니다: ' + name); process.exit(1); }
  const c = code(); d.users.push({name, code: c, added: new Date().toISOString().slice(0, 10)}); save(d); console.log(name + '\t' + c);
} else if (cmd === 'set' && name && process.argv[4]) {
  d.users = d.users.filter(u => u.name !== name); d.users.push({name, code: process.argv[4], added: new Date().toISOString().slice(0, 10)}); save(d); console.log(name + '\t' + process.argv[4]);
} else if (cmd === 'remove' && name) {
  const n = d.users.length; d.users = d.users.filter(u => u.name !== name); save(d); console.log(n === d.users.length ? '없는 이름입니다: ' + name : '취소: ' + name + ' (다시 빌드·배포해야 반영)');
} else if (cmd === 'list') { for (const u of d.users) console.log(u.name + '\t' + u.code + '\t' + (u.added || '')); console.log(d.users.length + '명'); }
else { console.log('사용법: add "이름" | set "이름" 코드 | remove "이름" | list'); }
