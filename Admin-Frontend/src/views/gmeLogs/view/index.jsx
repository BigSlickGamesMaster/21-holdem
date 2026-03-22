// import { formatNumber } from 'helper/helper'
import React, { useEffect, useState } from 'react'
import { getGameLogById } from 'query/gameLogs/gameLogs.query'
import { Col, Row, Table } from 'react-bootstrap'
import { useQuery } from 'react-query'
import { useParams } from 'react-router-dom'
import Wrapper from 'shared/components/Wrapper'

const ViewGameLogs = () => {
  const { id } = useParams()

  const [viewData, setViewData] = useState([])
  const [cardImages, setCardImages] = useState({})
  console.log(viewData)

  // const boardTypeList = [
  //   { name: '21 Hold-em', value: 'pokerJack' },
  //   // { name: 'Time Based', value: 'cash' },
  // ]

  async function getCard(card) {
    if (!card) return (await import('../../../assets/images/cards/dhsc.png')).default
    const image = await import(`../../../assets/images/cards/${card.slice(-1)}/${card.slice(0, -1)}${card.slice(-1)}.png`)
    return image.default
  }

  useEffect(() => {
    const loadCardImages = async () => {
      const images = {}

      // Load community cards
      if (viewData?.aCommunityCard) {
        for (const card of viewData.aCommunityCard) {
          const cardKey = card.nLabel + card.eSuit
          if (cardKey) {
            images[cardKey] = await getCard(cardKey)
          }
        }
      }

      // Load winner cards
      if (viewData?.aWinner) {
        for (const winner of viewData.aWinner) {
          for (const card of winner?.aCardHand || []) {
            const cardKey = card?.nLabel + card?.eSuit
            if (cardKey) {
              images[cardKey] = await getCard(cardKey)
            }
          }
        }
      }

      // Load loser cards
      if (viewData?.aLooser) {
        for (const item of viewData.aLooser) {
          for (const card of item?.aCardHand || []) {
            const cardKey = card?.nLabel + card?.eSuit
            if (cardKey) {
              images[cardKey] = await getCard(cardKey)
            }
          }
        }
      }

      setCardImages(images)
    }
    loadCardImages()
  }, [viewData])

  useQuery(['specificLog', id], () => getGameLogById(id), {
    select: data => data.data.data,
    onSuccess: response => {
      setViewData(response?.[0])
    },
  })

  useEffect(() => {
    document.title = 'View Game Logs | 21 Hold-em'
  }, [])

  return (
    <>
      <Row className="view-logs">
        <Col xs={12}>
          <Wrapper>
            <div className="table-config">
              {/* <div className="data-content">
                <span className="data-title">Board Type</span>
                <span className="data-value">{boardTypeList?.find(item => item?.value === viewData?.ePokerType)?.name || '-'}</span>
              </div> */}
              <div className="data-content">
                <span className="data-title">Game Type</span>
                <span className="data-value">{viewData?.sPrivateCode ? 'Private' : 'Public'}</span>
              </div>
              <div className="data-content">
                <span className="data-title">Game Name</span>
                <span className="data-value">{viewData?.sPrototypeName || '-'}</span>
              </div>
              <div className="data-content">
                <span className="data-title">Players</span>
                <span className="data-value">{viewData?.aWinner?.length + viewData?.aLooser?.length || '-'}</span>
              </div>
              <div className="data-content">
                <span className="data-title">Pot Amount</span>
                <span className="data-value">{viewData?.nTableChips || '0'}</span>
              </div>
              <div className="data-content">
                <span className="data-title">Rake Amount (%) </span>
                <span className="data-value">{viewData?.aWinner?.length > 0 ? (viewData?.nRakeAmount * viewData?.nTableChips) / 100 : '0'}</span>
              </div>
              <div className="data-content">
                <span className="data-title">Status</span>
                <span className="data-value">{viewData?.eState || '-'}</span>
              </div>
              <div className="data-content">
                <span className="data-title">Community Card</span>
                {viewData?.aCommunityCard?.length !== 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {viewData?.aCommunityCard?.map((card, index) => (
                      <img key={index} src={cardImages[card.nLabel + card.eSuit]} alt={card.nLabel + card.eSuit} style={{ height: '50px' }} />
                    ))}
                  </div>
                ) : (
                  <span className="data-value">N/A</span>
                )}
              </div>
            </div>
          </Wrapper>
        </Col>

        <Col xs={12} className="mt-3">
          <Wrapper>
            <h3>Game Winners</h3>
            <div className="line"></div>
            <Table responsive borderless className="table-borderless">
              <thead>
                <tr>
                  <th>No</th>
                  {/* <th>User ID</th> */}
                  <th>User Name</th>
                  {/* <th>Email ID</th> */}
                  <th>State</th>
                  <th>Table Chips</th>
                  <th>Card Score</th>
                  <th>Card</th>
                  <th>Wining Amount </th>
                </tr>
              </thead>
              <tbody>
                {viewData && viewData?.aWinner?.length > 0 ? (
                  viewData?.aWinner?.map((winner, index) => {
                    return (
                      <tr key={winner?.iUserId}>
                        <td>{index + 1}</td>
                        {/* <td>{winner?.iUserId || '-'}</td> */}
                        <td>
                          <span className="me-1">{winner?.sUserName || '-'}</span>
                          <span style={{ fontSize: '12px', color: 'var(--secondary-400)' }}>
                            {winner?.iUserId === viewData?.iSmallBlindId
                              ? '(SB)'
                              : winner?.iUserId === viewData?.iBigBlindId
                              ? '(BB)'
                              : winner?.iUserId === viewData?.iDealerId
                              ? '(D)'
                              : ''}
                          </span>
                        </td>
                        {/* <td>{winner?.sEmail || '-'}</td> */}
                        <td>{winner?.eState || '-'}</td>
                        <td>{winner?.nTotalAmountBated ?? '0'} </td>
                        <td>{winner?.nCardScore ?? '0'}</td>
                        {/* <td>{Array.isArray(winner?.aCardHand) ? winner.aCardHand.map(card => card.nLabel).join(', ') : '-'}</td> */}
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center' }}>
                            {winner?.aCardHand?.map((card, index) => (
                              <img key={index} src={cardImages[card.nLabel + card.eSuit]} alt={card.nLabel + card.eSuit} style={{ height: '50px' }} />
                            ))}
                          </div>
                        </td>
                        <td>{winner?.nWinningAmount ?? '0'}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>Admin Won!</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Wrapper>
        </Col>

        <Col xs={12} className="mt-3">
          <Wrapper>
            <h3>Game Loser</h3>
            <div className="line"></div>
            <Table responsive borderless>
              <thead>
                <tr>
                  <th>No</th>
                  {/* <th>User ID</th> */}
                  <th>User Name</th>
                  {/* <th>Email ID</th> */}
                  <th>State</th>
                  <th>Table Chips</th>
                  <th>Card Score</th>
                  <th>Card</th>
                  {/* <th>Wining Amount (in )</th> */}
                </tr>
              </thead>
              <tbody>
                {viewData && viewData?.aLooser?.length > 0 ? (
                  viewData?.aLooser?.map((item, index) => {
                    return (
                      <tr key={item?.iUserId}>
                        <td>{index + 1}</td>
                        {/* <td>{item?.iUserId || '-'}</td> */}
                        <td>
                          <span className="me-1">{item?.sUserName || '-'}</span>
                          <span style={{ fontSize: '12px', color: 'var(--secondary-400)' }}>
                            {item?.iUserId === viewData?.iSmallBlindId
                              ? '(SB)'
                              : item?.iUserId === viewData?.iBigBlindId
                              ? '(BB)'
                              : item?.iUserId === viewData?.iDealerId
                              ? '(D)'
                              : ''}
                          </span>
                        </td>
                        <td>{item?.eState || '-'}</td>
                        <td>{item?.nTotalAmountBated ?? '0'}</td>
                        <td>{item?.nCardScore ?? '0'}</td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center' }}>
                            {item?.aCardHand?.map((card, index) => (
                              <img key={index} src={cardImages[card.nLabel + card.eSuit]} alt={card.nLabel + card.eSuit} style={{ height: '50px' }} />
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>No Data Available</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Wrapper>
        </Col>
      </Row>
    </>
  )
}

export default ViewGameLogs
