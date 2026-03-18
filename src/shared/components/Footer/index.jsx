import React from "react";
import { Link } from "react-router-dom";
import iconGameRules from "../../../assets/images/icons/icon-gamepad.png";
import iconTermsConditions from "../../../assets/images/icons/icon-info.png";
import iconPrivacyPolicy from "../../../assets/images/icons/icon-secure.png";

const Footer = () => {
    return (
        <div className="footer">
            <div className="footer-menu">
                <ul>
                    <li><Link to={'/game-rule'}><img src={iconGameRules}  alt="" /> Game Rules</Link></li>
                    <li><Link to={'/terms-conditions'}><img src={iconTermsConditions}  alt="" /> Terms & Conditions</Link></li>
                    <li><Link to={'/privacy-policy'}><img src={iconPrivacyPolicy}  alt="" /> Privacy Policy</Link></li>
                </ul>
            </div>
        </div>
    )
}
export default Footer;
