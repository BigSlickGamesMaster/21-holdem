import React from 'react';
import { Navbar, Nav } from 'react-bootstrap';
import logo from '../../../../assets/images/splash/header_logo.png';
import { Link, useLocation } from 'react-router-dom';

const HeaderPublic = () => {

    const currentPath = useLocation().pathname;

    return (
        <Navbar expand="lg" className="header-public navbar-expand-xl">
            <Link to={'/login'} className="logo">
                <img src={logo} alt="logo" />
            </Link>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav" className='justify-content-end'>
                <Nav className="ml-auto navbar-link-grp">
                    <Link to={'/login'} className={`nav-item ${currentPath === '/login' ? 'active' : ''}`}>HOME</Link>
                    <Link to={'/about-us'} className={`nav-item ${currentPath === '/about-us' ? 'active' : ''}`}>ABOUT US</Link>
                    <Link to={'/guest'} className={`nav-item ${currentPath.startsWith('/guest') ? 'active' : ''}`}>GUEST MODE</Link>
                    <Link to={'/how-to-play'} className={`nav-item ${currentPath === '/how-to-play' ? 'active' : ''}`}>HOW TO PLAY</Link>
                    <Link to={'/contact'} className={`nav-item ${currentPath === '/contact' ? 'active' : ''}`}>CONTACT</Link>
                </Nav>
            </Navbar.Collapse>
        </Navbar>
    );
}

export default HeaderPublic;
