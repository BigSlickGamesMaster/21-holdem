import React, { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Game from 'views/game';
import Services from 'scripts/Services';
import GuestGameHelp from './GuestGameHelp';

function GuestGame() {
    const { sAuthToken } = useLocation()?.state || {};
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [activePanel, setActivePanel] = useState('pause');
    const [isPauseSyncPending, setIsPauseSyncPending] = useState(false);
    const oServices = useMemo(() => {
        if (!sAuthToken) return null;
        return new Services({
            sRoot: process.env.REACT_APP_API_ENDPOINT,
            authorization: sAuthToken,
        });
    }, [sAuthToken]);

    const syncGuestPause = useCallback(async (bShouldPause) => {
        if (!oServices) return true;

        setIsPauseSyncPending(true);
        try {
            if (bShouldPause) await oServices.pauseGuestBoard();
            else await oServices.resumeGuestBoard();
            return true;
        } catch (error) {
            console.error('Guest pause sync failed', error);
            return false;
        } finally {
            setIsPauseSyncPending(false);
        }
    }, [oServices]);

    const handleOpenPanel = useCallback(async (panelId) => {
        setActivePanel(panelId);
        if (isHelpOpen) return;

        setIsHelpOpen(true);
        const bPauseSynced = await syncGuestPause(true);
        if (!bPauseSynced) setIsHelpOpen(false);
    }, [isHelpOpen, syncGuestPause]);

    const handleCloseHelp = useCallback(async () => {
        setIsHelpOpen(false);
        const bResumeSynced = await syncGuestPause(false);
        if (!bResumeSynced) setIsHelpOpen(true);
    }, [syncGuestPause]);

    const handleTogglePause = useCallback(async () => {
        if (isHelpOpen) {
            await handleCloseHelp();
            return;
        }

        setActivePanel('pause');
        setIsHelpOpen(true);
        const bPauseSynced = await syncGuestPause(true);
        if (!bPauseSynced) setIsHelpOpen(false);
    }, [handleCloseHelp, isHelpOpen, syncGuestPause]);

    return (
        <div id='main-layout' className='main-layout gameplay-layout'>
            <div className='guest-game-stage-shell'>
                <Game isPausedExternally={isHelpOpen} />
                <GuestGameHelp
                    isOpen={isHelpOpen}
                    activePanel={activePanel}
                    onOpenPanel={handleOpenPanel}
                    onTogglePause={handleTogglePause}
                    onClose={handleCloseHelp}
                    isBusy={isPauseSyncPending}
                />
            </div>
        </div>
    );
}

export default GuestGame;
