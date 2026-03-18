import React from 'react';
import Game from 'views/game';
import TutorialOverlay from './TutorialOverlay';

function GuestTutorialGame() {
    return (
        <div id='main-layout' className='main-layout gameplay-layout guest-tutorial-shell'>
            <Game />
            <TutorialOverlay />
        </div>
    );
}

export default GuestTutorialGame;
