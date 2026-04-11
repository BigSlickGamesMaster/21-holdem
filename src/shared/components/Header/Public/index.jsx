import React, { useEffect, useRef, useState } from 'react';
import { Navbar, Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';

const HeaderPublic = () => {
    const [expanded, setExpanded] = useState(false);
    const headerRef = useRef(null);
    const { pathname } = useLocation();
    const handleOpenBugPanel = () => {
        setExpanded(false);
        window.FXOverlayUI?.toggleBugPanel?.();
    };

    useEffect(() => {
        setExpanded(false);
    }, [pathname]);

    useEffect(() => {
        if (!expanded) return undefined;

        const handlePointerDown = event => {
            if (headerRef.current && !headerRef.current.contains(event.target)) {
                setExpanded(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [expanded]);

    return (
        <Navbar ref={headerRef} expand="lg" expanded={expanded} className="header-public navbar-expand-xl">
            <Navbar.Toggle aria-controls="basic-navbar-nav" onClick={() => setExpanded(current => !current)} />
            <Navbar.Collapse id="basic-navbar-nav" className='justify-content-end'>
                <Nav className="ml-auto navbar-link-grp">
                    <Link to={'/guest'} className={`nav-item ${pathname === '/guest' ? 'active' : ''}`} onClick={() => setExpanded(false)}>HOME</Link>
                    <Link to={'/about-us'} className={`nav-item ${pathname === '/about-us' ? 'active' : ''}`} onClick={() => setExpanded(false)}>ABOUT US</Link>
                    <Link to={'/guest'} className={`nav-item ${pathname.startsWith('/guest') ? 'active' : ''}`} onClick={() => setExpanded(false)}>GUEST MODE</Link>
                    <Link to={'/how-to-play'} className={`nav-item ${pathname === '/how-to-play' ? 'active' : ''}`} onClick={() => setExpanded(false)}>HOW TO PLAY</Link>
                    <Link to={'/contact'} className={`nav-item ${pathname === '/contact' ? 'active' : ''}`} onClick={() => setExpanded(false)}>CONTACT</Link>
                    <button type='button' className='nav-item header-public__bug-link' onClick={handleOpenBugPanel}>REPORT BUG</button>
                </Nav>
            </Navbar.Collapse>
        </Navbar>
    );
}

export default HeaderPublic;
