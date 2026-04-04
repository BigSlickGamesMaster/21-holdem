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
  .map((key, index) => ({
    id: `profile-image-${index + 1}`,
    label: `Profile ${index + 1}`,
    sPath: avatarContext(key),
  }));

export const DEFAULT_PROFILE_BANNER = BUILT_IN_AVATARS[0]?.sPath || '';

export function getBuiltInAvatar(seed = '') {
  if (!BUILT_IN_AVATARS.length) {
    return {
      id: 'profile-image-fallback',
      label: 'Profile',
      sPath: '',
    };
  }

  return BUILT_IN_AVATARS[Math.abs(hashSeed(seed)) % BUILT_IN_AVATARS.length];
}

export function getAvatarImageSrc(src, seed = '') {
  if (!src || isLegacyBuiltInAvatar(src)) {
    return getBuiltInAvatar(seed).sPath || DEFAULT_PROFILE_BANNER;
  }

  return src;
}

export function buildAvatarOptions(aAvatarList = [], sAvatar = '') {
  const avatars = [];
  const seen = new Set();
  const normalizedSelectedAvatar = getAvatarImageSrc(sAvatar);

  const addAvatar = avatar => {
    if (!avatar?.sPath || seen.has(avatar.sPath)) return;
    seen.add(avatar.sPath);
    avatars.push({
      ...avatar,
      selected: avatar.sPath === normalizedSelectedAvatar,
    });
  };

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
