import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const Shop = () => {
    const location = useLocation();
    const oParams = new URLSearchParams(location.search);

    oParams.set('tab', 'lobby-shop');

    return <Navigate replace to={`/lobby?${oParams.toString()}`} />;
};

export default Shop;
