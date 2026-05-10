import React, { Suspense } from "react";
import PropTypes from "prop-types";
import { Spinner } from "react-bootstrap";
import Footer from "shared/components/Footer";

function AuthLayout({ children }) {
    return (
        <div className="auth-main">
            <div className="auth-layout-background"></div>
            <div className={`auth-container container-fluid`}>
                <Suspense
                    fallback={
                        <div className="d-flex align-items-center justify-content-center top-0 left-0 position-fixed h-100">
                            <Spinner animation="border" variant="success" />
                        </div>
                    }
                >
                    {children}
                </Suspense>
            </div>
            <Footer />
        </div>
    );
}

AuthLayout.propTypes = {
    children: PropTypes.node.isRequired,
};

export default AuthLayout;
