/**
 * 랜덤 익명 작성자명 생성.
 * 보험설계사 커뮤니티 톤에 맞는 형용사 + 명사 조합을 사용한다.
 * 생성된 이름은 site_settings.author_name_max_length를 넘지 않도록 보장된 조합만 사용한다.
 */
const ADJECTIVES = [
  '든든한',
  '성실한',
  '꼼꼼한',
  '친절한',
  '열정적인',
  '노련한',
  '부지런한',
  '믿음직한',
  '유쾌한',
  '차분한',
  '용감한',
  '겸손한',
];

const NOUNS = ['설계사', '컨설턴트', '보험맨', '보험우먼', '영업왕', '신입', '팀장', '지점장'];

export function generateAnonName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adjective} ${noun}`;
}
