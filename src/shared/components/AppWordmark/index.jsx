import React from 'react';
import logoImage from '../../../assets/images/bg/21HLogo.png';

const AppWordmark = ({ className = '' }) => {
    return (
        <img className={className} src={logoImage} alt="21 Hold'em" />
    );
};

export default AppWordmark;
