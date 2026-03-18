import React from 'react';
import { RULES_SECTIONS } from 'shared/content/gameGuideContent';

const GameRule = () => {
    return (
        <div className='cms-page'>
            <div className="cms-header">21 Hold&apos;em - Official Rules</div>
            <div className="cms-content">
                {RULES_SECTIONS.map(section => (
                    <div key={section.title}>
                        <p className='content-title'>{section.title}</p>
                        {section.paragraphs?.map(paragraph => (
                            <p key={paragraph}>{paragraph}</p>
                        ))}
                        {section.bullets?.length ? (
                            <ul>
                                {section.bullets.map(item => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GameRule;
