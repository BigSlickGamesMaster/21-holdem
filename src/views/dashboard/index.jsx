import { getTables, joinTable } from 'query/gameTable.query';
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getCookie, ReactToastify } from 'shared/utils';
import gift_icon from '../../assets/images/icons/gift_icon.png';
import privateTable_icon from '../../assets/images/icons/privateTable_icon.png';
import LobbyPreviewOverlay from './LobbyPreviewOverlay';

const Dashboard = () => {
    const navigate = useNavigate();
    const [tablesData, setTablesData] = useState([]);
    const queryClient = useQueryClient();

    const { mutate: joinTableMutate, isLoading: joinTableLoading } = useMutation(joinTable, {
        onSuccess: (data) => {
            if (data.status === 200) {
                navigate('/game', { state: { sAuthToken: getCookie('sAuthToken'), iBoardId: data.data.data.iBoardId } });
            }
        },
        onError: (error) => {
            console.log(error);
            ReactToastify(error?.response?.data?.message, 'error');
            queryClient.invalidateQueries('getTables');
        },
    });

    const { isLoading: isDataTableLoading } = useQuery('getTables', getTables, {
        onSuccess: (data) => {
            if (data.status === 200) {
                setTablesData(data.data.data || []);
                return;
            }
            if (data.status === 404) {
                setTablesData([]);
            }
        },
        onError: (error) => {
            console.log(error);
            setTablesData([]);
        },
    });

    return (
        <div className='dashboard-container'>
            <div className='dashboard-container__content'>
                <div className='dashboard-container__content-table-selection'>
                    <div className='dashboard-container__content-table-selection-content'>
                        <div className='sub-dashboard-container__content'>
                            <div className='dashboard-container__content-table-selection-content-options'>
                                <Link to='/daily-rewards'><img src={gift_icon} alt='gift' />Daily Rewards</Link>
                                <Link to='/private-table'><img src={privateTable_icon} alt='private table' />Private Table</Link>
                                <div className='dashboard-live-pill'>Live Matchmaking</div>
                            </div>

                            <LobbyPreviewOverlay
                                isOpen
                                isEmbedded
                                tables={tablesData}
                                onJoinTable={joinTableMutate}
                                isJoining={joinTableLoading}
                                isLoading={isDataTableLoading}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
