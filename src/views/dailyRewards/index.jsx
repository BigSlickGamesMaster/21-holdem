import React, { useState } from 'react'
import chips1 from '../../assets/images/daily-rewards/chips1.png'
import chips2 from '../../assets/images/daily-rewards/chips2.png'
import chips3 from '../../assets/images/daily-rewards/chips3.png'
import chips4 from '../../assets/images/daily-rewards/chips4.png'
import chips5 from '../../assets/images/daily-rewards/chips5.png'
import chips6 from '../../assets/images/daily-rewards/chips6.png'
import chips7 from '../../assets/images/daily-rewards/chips7.png'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { getDailyRewards, updateDailyRewards } from 'query/dailyRewards.query'
import { ReactToastify } from 'shared/utils'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons'

const DailyRewards = () => {

    const queryClient = useQueryClient()
    const dailyRewardsIcon = [chips1, chips2, chips3, chips4, chips5, chips6, chips7]
    const [showAnimation, setShowAnimation] = useState(false)

    const { data: dataDailyRewards, isLoading: isDailyRewardsLoading } = useQuery("getDailyRewards", getDailyRewards, {
        select: (data) => data?.data?.data,
        onSuccess: (response) => {

        },
        onError: (error) => {
            console.log(error)
            ReactToastify(error?.response?.data?.message, 'error');
        }
    });

    const { mutate: mutateDailyRewardsClaimed } = useMutation("updateDailyRewards", updateDailyRewards, {
        onSuccess: (response) => {
            if (response?.status === 200) {
                ReactToastify(response?.data?.message, 'success');
                queryClient.invalidateQueries('profileData')
                setShowAnimation(true)

                setTimeout(() => {
                    setShowAnimation(false)
                }, 3000);
            }
            else {
                ReactToastify(response?.data?.message, 'error');
            }
            queryClient.invalidateQueries('getDailyRewards')
        },
        onError: (error) => {
            console.log(error)
            queryClient.invalidateQueries('getDailyRewards')
            ReactToastify(error?.response?.data?.message, 'error');
        }
    });

    return (
        <div className='daily-rewards-page'>
            <div className="daily-rewards-header">Daily Rewards</div>
            <div className="daily-rewards-content">
                <div className="daily-rewards-card-list">
                    {
                        dataDailyRewards?.rewards?.map((item, index) => (
                            <div className={`daily-rewards-card ${dataDailyRewards?.eligibleDay === index + 2 && showAnimation ? 'animation' : ''} ${(dataDailyRewards?.eligibleDay === index + 1 && !dataDailyRewards?.bTodayRewardClaimed) ? 'active' : ''} ${dataDailyRewards?.eligibleDay < index + 1 || dataDailyRewards?.bTodayRewardClaimed ? 'deactive' : ''}`} key={index}>
                                {
                                    (dataDailyRewards?.eligibleDay > index + 1) && (
                                        <div className="daily-rewards-selected">
                                            <FontAwesomeIcon icon={faCheckCircle} />
                                            Claimed
                                        </div>
                                    )
                                }
                                <div className="daily-reward-day">DAY {index + 1}</div>
                                <div className="daily-reward-content">
                                    <img src={dailyRewardsIcon[index]} alt="chips" />
                                    <div className="daily-rewards-amount">{item}</div>
                                </div>
                            </div>
                        ))
                    }
                </div>
                <div className="daily-reward-button">
                    <button
                        className={`btn ${!dataDailyRewards?.bTodayRewardClaimed ? '' : 'btn-disabled'}`}
                        onClick={() => {
                            if (!dataDailyRewards?.bTodayRewardClaimed) {
                                mutateDailyRewardsClaimed()
                            }
                        }}
                    >
                        Claim Reward
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DailyRewards