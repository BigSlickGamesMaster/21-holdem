const avatarContext = require.context(
  '../../assets/images/player-profile/profile_images',
  false,
  /\.(png|jpe?g|webp)$/i
);

function hashSeed(seed = '') {
  return String(seed || 'guest')
    .split('')
    .reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) % 2147483647, 7);
}

function isLegacyBuiltInAvatar(src = '') {
  return String(src || '').startsWith('data:image/svg+xml');
}

export const BUILT_IN_AVATARS = avatarContext
  .keys()
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
  .map((key, index) => {
    const sPath = avatarContext(key)
    const sFileName = String(key || '').replace('./', '')
    const sTextureKey = `built-in-avatar-${sFileName.replace(/\.(png|jpe?g|webp)$/i, '')}`

    return {
      id: `profile-image-${index + 1}`,
      label: `Profile ${index + 1}`,
      sPath,
      sTextureKey,
      sFileName,
    }
  })

export const DEFAULT_BUILT_IN_AVATARS = BUILT_IN_AVATARS.slice(0, 12)

export const DEFAULT_PROFILE_BANNER = BUILT_IN_AVATARS[0]?.sPath || '';
export const INITIALS_AVATAR_VALUE = '__player_initials__';

export function isInitialsAvatar(src = '') {
  return String(src || '') === INITIALS_AVATAR_VALUE;
}

export function getBuiltInAvatar(seed = '', seatIndex = -1) {
  if (!DEFAULT_BUILT_IN_AVATARS.length) {
    return {
      id: 'profile-image-fallback',
      label: 'Profile',
      sPath: '',
    };
  }

  const index = seatIndex >= 0
    ? seatIndex % DEFAULT_BUILT_IN_AVATARS.length
    : Math.abs(hashSeed(seed)) % DEFAULT_BUILT_IN_AVATARS.length;
  return DEFAULT_BUILT_IN_AVATARS[index];
}

export function getAvatarImageSrc(src, seed = '', seatIndex = -1) {
  if (isInitialsAvatar(src)) return '';

  if (!src || isLegacyBuiltInAvatar(src)) {
    return getBuiltInAvatar(seed, seatIndex).sPath || DEFAULT_PROFILE_BANNER;
  }

  return src;
}

export function getAvatarTextureKey(src, seed = '') {
  const normalizedSrc = getAvatarImageSrc(src, seed)
  const matchedAvatar = BUILT_IN_AVATARS.find((avatar) => avatar.sPath === normalizedSrc)

  if (matchedAvatar?.sTextureKey) return matchedAvatar.sTextureKey

  return ''
}

export function buildAvatarOptions(aAvatarList = [], sAvatar = '') {
  const avatars = [];
  const seen = new Set();
  const useInitials = isInitialsAvatar(sAvatar);
  const normalizedSelectedAvatar = useInitials ? INITIALS_AVATAR_VALUE : getAvatarImageSrc(sAvatar);

  const addAvatar = avatar => {
    if (!avatar?.sPath || seen.has(avatar.sPath)) return;
    seen.add(avatar.sPath);
    avatars.push({
      ...avatar,
      selected: avatar.sPath === normalizedSelectedAvatar,
    });
  };

  addAvatar({
    id: 'profile-image-initials',
    label: 'Initials',
    sPath: INITIALS_AVATAR_VALUE,
    isInitials: true,
  });

  BUILT_IN_AVATARS.forEach(addAvatar);
  (aAvatarList || []).forEach((item, index) => addAvatar({
    id: `remote-avatar-${index + 1}`,
    label: `Avatar ${index + 1}`,
    sPath: item,
  }));

  if (normalizedSelectedAvatar && !seen.has(normalizedSelectedAvatar)) {
    addAvatar({
      id: 'current-avatar',
      label: 'Current Avatar',
      sPath: normalizedSelectedAvatar,
    });
  }

  if (!avatars.some(avatar => avatar.selected) && avatars.length) {
    avatars[0].selected = true;
  }

  return avatars;
}

export default BUILT_IN_AVATARS;
