import React from 'react'
import { Link } from 'react-router-dom';

const highlights = [
    {
        title: 'Shared Board Pressure',
        body: 'Every community card affects everyone still in the hand, so each reveal can improve or damage your total.',
    },
    {
        title: 'Blackjack Decisions With Poker Tension',
        body: 'Call, raise, stand and double down all carry different levels of risk depending on your stack and the table state.',
    },
    {
        title: 'Short, Readable Rounds',
        body: 'The format is easy to follow for new players while still giving experienced players room to pressure the table.',
    },
];

const principles = [
    'Build toward 21 without overcommitting chips too early.',
    'Use Stand when you want to lock a total and stop later board cards from changing it.',
    'Use Double Down when one final card is worth the extra risk.',
    'Read the table, not just your own hand, because everyone shares the board.',
];

const About = () => {
    return (
        <div className='cms-page about-page'>
            <div className="cms-header">About 21 Hold&apos;em</div>
            <div className="cms-content">
                <div className="about-hero">
                    <div className="about-hero-copy">
                        <p className="content-title">A fast table game that blends blackjack instincts with poker table pressure.</p>
                        <p>
                            21 Hold&apos;em is built around shared community cards, visible betting pressure, and risk decisions that stay readable for new players.
                            You are not just chasing a number. You are managing position, table momentum, and when to protect or attack your total.
                        </p>
                        <p>
                            The goal is simple: make the strongest total you can without losing control of the hand. The interesting part is how you get there.
                        </p>
                    </div>
                    <div className="about-cta-card">
                        <div className="about-cta-label">No account needed to look around</div>
                        <h3>Use Guest Mode first</h3>
                        <p>
                            If you want to understand the table before registering, Guest Mode opens a demo table immediately and lets you see the pace of play.
                        </p>
                        <div className="about-actions">
                            <Link to="/guest" className="about-action primary">Play as Guest</Link>
                            <Link to="/login" className="about-action secondary">Sign In</Link>
                        </div>
                    </div>
                </div>

                <div className="about-highlight-grid">
                    {highlights.map((item) => (
                        <div key={item.title} className="about-highlight-card">
                            <h3>{item.title}</h3>
                            <p>{item.body}</p>
                        </div>
                    ))}
                </div>

                <p className="content-title">What makes the game work</p>
                <ul>
                    {principles.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>

                <p className="content-title">What players should expect</p>
                <p>
                    Early hands are easy to read, but table pressure escalates quickly once betting opens. That is where discipline matters.
                    Calling keeps you alive, standing protects a number you trust, and doubling down is a deliberate attack when one more card is worth the exposure.
                </p>
                <p>
                    The current build is focused on getting the core table flow solid and readable first. The guest entry path, player identity polish, and content pass are part of that push.
                </p>
            </div>
        </div>
    )
}

export default About
