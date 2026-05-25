const LAYOUTS = {
    mobile: {
        width: 1080,
        height: 1920,
    },
    desktop: {
        width: 1920,
        height: 1080,
    },
};

const config = {
    title: `21 Hold'em`,
    width: LAYOUTS.mobile.width,
    height: LAYOUTS.mobile.height,
    centerX: LAYOUTS.mobile.width / 2,
    centerY: LAYOUTS.mobile.height / 2,
    layoutMode: 'mobile',
    version: '1.3',
    CommonFont: 'NeuePlakCondensed',
    ButtonFont: 'TTCommons',
    playerFont: 'playerFont',
    playerFontBold: 'playerFontBold',
    CardFont: 'CardFont',
};

config.setLayout = function setLayout(layoutMode = 'mobile') {
    const nextLayout = LAYOUTS[layoutMode] || LAYOUTS.mobile;
    this.layoutMode = layoutMode in LAYOUTS ? layoutMode : 'mobile';
    this.width = nextLayout.width;
    this.height = nextLayout.height;
    this.centerX = nextLayout.width / 2;
    this.centerY = nextLayout.height / 2;
};

config.isDesktopLayout = function isDesktopLayout() {
    return this.layoutMode === 'desktop';
};

export default config;
