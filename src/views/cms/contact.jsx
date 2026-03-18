import React from 'react'

const Contact = () => {
    return (
        <div className='cms-page contact-page'>
            <div className="cms-header">Contact Us</div>
            <div className="cms-content">
                <p className="content-title">Last updated: 5 March 2026</p>
                <p>
                    21 Hold&apos;em support operations are managed from Brisbane, Queensland, Australia.
                    For the fastest response, include your username, device type, and when the issue occurred.
                </p>
                <p className="content-title">What you can contact us about</p>
                <ul>
                    <li>Account access issues, verification problems, and password reset support.</li>
                    <li>Gameplay bugs, technical errors, and unexpected behaviour.</li>
                    <li>Transaction, virtual chips, and purchase-related questions.</li>
                    <li>Privacy requests, including access, correction, or account deletion.</li>
                    <li>Terms and legal enquiries.</li>
                </ul>
                <p className="content-title">How to send a request</p>
                <p>
                    Email us at <a href="mailto:bigslickgames@gmail.com">bigslickgames@gmail.com</a>.
                </p>
                <p>
                    For privacy or legal matters, add &quot;Privacy Request&quot; or &quot;Legal Request&quot; in your subject/title so we can prioritise correctly.
                </p>
                <p className="content-title">Bug Reports</p>
                <p>
                    Use the in-app &quot;Found a bug?&quot; popout to submit bug details. If that popout is unavailable, email
                    {' '}<a href="mailto:bigslickgames@gmail.com">bigslickgames@gmail.com</a>.
                </p>
            </div>
        </div>
    )
}

export default Contact
