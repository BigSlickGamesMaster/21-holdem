import React from 'react';
import { HOW_TO_PLAY_SECTIONS } from 'shared/content/gameGuideContent';

const HowToPlay = () => {
    return (
        <div className='cms-page'>
            <div className="cms-header">How To Play</div>
            <div className="cms-content">
                {HOW_TO_PLAY_SECTIONS.map((section, index) => (
                    <div key={section.title}>
                        <p className={`content-title ${index === 0 ? 'mt-0' : ''}`}>{section.title}</p>
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

export default HowToPlay;
