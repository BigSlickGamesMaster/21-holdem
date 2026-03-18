const svgToDataUri = svg => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;

const createAvatarSvg = ({ backgroundStart, backgroundEnd, content }) => `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'>
  <defs>
    <linearGradient id='avatarBg' x1='18' y1='16' x2='142' y2='144' gradientUnits='userSpaceOnUse'>
      <stop offset='0%' stop-color='${backgroundStart}' />
      <stop offset='100%' stop-color='${backgroundEnd}' />
    </linearGradient>
  </defs>
  <circle cx='80' cy='80' r='76' fill='url(#avatarBg)' />
  <circle cx='80' cy='80' r='68' fill='#FFFFFF' fill-opacity='0.12' />
  ${content}
</svg>
`;

export const BUILT_IN_AVATARS = [
  {
    id: 'cherry',
    label: 'Lucky Cherry',
    sPath: svgToDataUri(
      createAvatarSvg({
        backgroundStart: '#5C2E91',
        backgroundEnd: '#FF7AA2',
        content: `
          <path d='M63 57C61 45 53 32 40 24' stroke='#6D3E18' stroke-width='6' stroke-linecap='round' fill='none' />
          <path d='M93 56C98 43 108 31 122 25' stroke='#6D3E18' stroke-width='6' stroke-linecap='round' fill='none' />
          <ellipse cx='104' cy='34' rx='15' ry='9' fill='#79D47C' transform='rotate(-18 104 34)' />
          <circle cx='61' cy='91' r='28' fill='#FF566E' />
          <circle cx='98' cy='91' r='28' fill='#FF6E83' />
          <circle cx='53' cy='82' r='5' fill='#FFFFFF' fill-opacity='0.28' />
          <circle cx='90' cy='82' r='5' fill='#FFFFFF' fill-opacity='0.28' />
          <circle cx='71' cy='92' r='4' fill='#35123D' />
          <circle cx='89' cy='92' r='4' fill='#35123D' />
          <path d='M74 105C78 109 83 109 87 105' stroke='#35123D' stroke-width='4' stroke-linecap='round' fill='none' />
        `,
      })
    ),
  },
  {
    id: 'mug',
    label: 'Cozy Mug',
    sPath: svgToDataUri(
      createAvatarSvg({
        backgroundStart: '#3A8D82',
        backgroundEnd: '#A7E8D3',
        content: `
          <path d='M56 58C62 46 71 40 80 40C89 40 98 46 104 58' fill='#F5A0C4' />
          <path d='M50 58H110V103C110 115 100 124 88 124H72C60 124 50 115 50 103V58Z' fill='#FFF2D8' />
          <path d='M110 71H121C129 71 136 77 136 85C136 93 129 99 121 99H110' fill='none' stroke='#FFF2D8' stroke-width='11' stroke-linecap='round' />
          <path d='M66 49C66 44 69 39 73 35' stroke='#FFFFFF' stroke-width='5' stroke-linecap='round' fill='none' opacity='0.8' />
          <path d='M84 47C84 42 87 37 91 33' stroke='#FFFFFF' stroke-width='5' stroke-linecap='round' fill='none' opacity='0.8' />
          <circle cx='72' cy='86' r='4' fill='#57331A' />
          <circle cx='89' cy='86' r='4' fill='#57331A' />
          <path d='M74 98C78 103 83 103 87 98' stroke='#57331A' stroke-width='4' stroke-linecap='round' fill='none' />
        `,
      })
    ),
  },
  {
    id: 'dice',
    label: 'Lucky Dice',
    sPath: svgToDataUri(
      createAvatarSvg({
        backgroundStart: '#194C9C',
        backgroundEnd: '#7CC8FF',
        content: `
          <rect x='39' y='39' width='82' height='82' rx='24' fill='#FFFFFF' />
          <circle cx='58' cy='58' r='6' fill='#22406B' />
          <circle cx='102' cy='58' r='6' fill='#22406B' />
          <circle cx='58' cy='102' r='6' fill='#22406B' />
          <circle cx='102' cy='102' r='6' fill='#22406B' />
          <circle cx='70' cy='79' r='4' fill='#22406B' />
          <circle cx='90' cy='79' r='4' fill='#22406B' />
          <path d='M72 92C77 97 83 97 88 92' stroke='#22406B' stroke-width='4' stroke-linecap='round' fill='none' />
          <circle cx='113' cy='47' r='8' fill='#F7D66B' />
          <path d='M113 34V22' stroke='#F7D66B' stroke-width='4' stroke-linecap='round' />
          <path d='M126 47H138' stroke='#F7D66B' stroke-width='4' stroke-linecap='round' />
        `,
      })
    ),
  },
  {
    id: 'key',
    label: 'Golden Key',
    sPath: svgToDataUri(
      createAvatarSvg({
        backgroundStart: '#9B5219',
        backgroundEnd: '#FFD472',
        content: `
          <circle cx='66' cy='70' r='27' fill='none' stroke='#FFF1A8' stroke-width='13' />
          <circle cx='66' cy='70' r='10' fill='none' stroke='#E3A93B' stroke-width='5' />
          <path d='M86 82L117 113' stroke='#FFF1A8' stroke-width='13' stroke-linecap='round' />
          <path d='M108 104H126V117H115V128H102V117H97' stroke='#FFF1A8' stroke-width='10' stroke-linejoin='round' fill='none' stroke-linecap='round' />
          <circle cx='58' cy='66' r='4' fill='#734216' />
          <circle cx='74' cy='66' r='4' fill='#734216' />
          <path d='M60 79C64 83 69 83 73 79' stroke='#734216' stroke-width='4' stroke-linecap='round' fill='none' />
        `,
      })
    ),
  },
  {
    id: 'gem',
    label: 'Pocket Gem',
    sPath: svgToDataUri(
      createAvatarSvg({
        backgroundStart: '#0F6D7D',
        backgroundEnd: '#9BF6FF',
        content: `
          <path d='M48 68L65 46H95L112 68L80 116Z' fill='#76E4F7' />
          <path d='M48 68H112L80 116Z' fill='#4AC6E0' />
          <path d='M65 46L80 68L95 46' fill='none' stroke='#D6FBFF' stroke-width='4' stroke-linejoin='round' />
          <path d='M80 68L65 46' stroke='#D6FBFF' stroke-width='4' />
          <path d='M80 68L95 46' stroke='#D6FBFF' stroke-width='4' />
          <circle cx='72' cy='83' r='4' fill='#12586A' />
          <circle cx='88' cy='83' r='4' fill='#12586A' />
          <path d='M74 95C78 99 82 99 86 95' stroke='#12586A' stroke-width='4' stroke-linecap='round' fill='none' />
          <path d='M118 46L122 36L126 46L136 50L126 54L122 64L118 54L108 50Z' fill='#FFF6AD' />
        `,
      })
    ),
  },
  {
    id: 'plant',
    label: 'Desk Plant',
    sPath: svgToDataUri(
      createAvatarSvg({
        backgroundStart: '#2F7D32',
        backgroundEnd: '#B9F18C',
        content: `
          <path d='M80 55C80 41 90 30 103 26C106 42 98 55 80 63Z' fill='#77D86A' />
          <path d='M80 59C64 55 55 43 57 27C70 31 80 41 80 59Z' fill='#8EE57E' />
          <path d='M82 67C83 54 90 43 101 37' stroke='#316F32' stroke-width='4' stroke-linecap='round' fill='none' />
          <path d='M78 67C76 55 69 45 59 39' stroke='#316F32' stroke-width='4' stroke-linecap='round' fill='none' />
          <path d='M52 81H108L101 120H59Z' fill='#C97847' />
          <path d='M56 81H104L100 95H60Z' fill='#E48F57' />
          <circle cx='71' cy='98' r='4' fill='#552E1E' />
          <circle cx='89' cy='98' r='4' fill='#552E1E' />
          <path d='M73 110C77 114 82 114 87 110' stroke='#552E1E' stroke-width='4' stroke-linecap='round' fill='none' />
        `,
      })
    ),
  },
];

function hashSeed(seed = '') {
  return String(seed || 'guest')
    .split('')
    .reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) % 2147483647, 7);
}

export function getBuiltInAvatar(seed = '') {
  return BUILT_IN_AVATARS[Math.abs(hashSeed(seed)) % BUILT_IN_AVATARS.length];
}

export function getAvatarImageSrc(src, seed = '') {
  return src || getBuiltInAvatar(seed).sPath;
}

export function buildAvatarOptions(aAvatarList = [], sAvatar = '') {
  const avatars = [];
  const seen = new Set();

  const addAvatar = avatar => {
    if (!avatar?.sPath || seen.has(avatar.sPath)) return;
    seen.add(avatar.sPath);
    avatars.push({
      ...avatar,
      selected: avatar.sPath === sAvatar,
    });
  };

  BUILT_IN_AVATARS.forEach(addAvatar);
  (aAvatarList || []).forEach((item, index) => addAvatar({
    id: `remote-avatar-${index + 1}`,
    label: `Avatar ${index + 1}`,
    sPath: item,
  }));
  if (sAvatar && !seen.has(sAvatar)) addAvatar({ id: 'current-avatar', label: 'Current Avatar', sPath: sAvatar });

  if (!avatars.some(avatar => avatar.selected) && avatars.length) {
    avatars[0].selected = true;
  }

  return avatars;
}

export default BUILT_IN_AVATARS;
