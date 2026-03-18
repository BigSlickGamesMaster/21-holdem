import React from 'react'
import poker_table_image from '../../../assets/images/ui/pocker_table_image.png'
import private_table_image from '../../../assets/images/ui/private-table-image.png'
import _ from 'scripts/helper';
import iconRapid from "../../../assets/images/icons/flash-sale.png";
import EightIcon from "../../../assets/images/icons/Eight_logo.png";

function CustomTable({ tableName, minChips, minBuyIn, onPlay, isPrivate, isRapid,isMultiDeck }) {
    return (
        <div className="table-card">
            <div className="table-image">
                <div className="table-name">{_.appendSuffix(tableName)}</div>
                <img src={isPrivate ? private_table_image : poker_table_image} alt="21 Hold'em Table" />
            </div>
            <div className="table-info">
                {/* <div className="entry_amount-info">
                    <span className='entry_amount-info-label'>Entry Amount:</span>
                    <span className='entry_amount-info-value'>{entryAmount}</span>
                    </div> */}
                <span className="min-chips">Min Buy In: {minBuyIn}</span>
                <span className="max-chips">Max Bet: Pot Limit</span>
                {/* <div className="chips-info">
                    <span className="min-chips">Min Bet: {minChips}</span>
                </div> */}
            </div>
            <div className="table-play">
                <button className="play-button" style={{ width: isRapid && isMultiDeck
                ? "80%"
                : isRapid
                ? "90%"
                : "100%" }} onClick={onPlay}>
                    Play Now
                </button>
                {isRapid && <div className="corner-icon"><img style={{ width: '40px' }} src={iconRapid} alt="" /></div>}
                {isMultiDeck && <div className="corner-icon"><img style={{ width: '40px' }} src={EightIcon} alt="" /></div>}
            </div>
        </div>
    );
}
export default CustomTable