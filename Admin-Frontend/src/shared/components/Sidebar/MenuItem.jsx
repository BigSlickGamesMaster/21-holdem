/* eslint-disable react/no-unknown-property */
/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import PropTypes from 'prop-types'

function MenuItem ({ item, isMenuOpen, activeSubMenu, toggleSubMenu }) {
	const [isOpen, setIsOpen] = useState(false)
	const childPaths = item.children && item?.children?.map((i) => i?.path?.split('/')[1])
	const location = useLocation()
	const currentPathSlashIndex = location.pathname.split('/').length
	useEffect(() => {
		!isMenuOpen && setIsOpen(false)
	}, [isMenuOpen])

	useEffect(() => {
		setIsOpen(activeSubMenu === item?.path)
	}, [activeSubMenu, item?.path])

	const toggle = () => {
		setIsOpen(!isOpen)
		toggleSubMenu(isOpen ? null : item?.path)
	}

	return (
		<li className={isOpen ? 'open' : ''}>
			{item?.children ? (<>
				<span onClick={toggle} className={isOpen === true ? "toggle-btn-open" : ""} >
					<span
						// to={item.path}
						activeclassname={`active ${!item.children && 'pe-none'} `}
						className={childPaths?.includes(location.pathname.split('/')[1]) ? 'active pe-none list-name' : 'list-name'}
					>
						<i>
							<img
								src={item.icon}
								alt={isMenuOpen && item.title}
							/>
						</i>
						<div className='side-bar-text'> {isMenuOpen && item.title} </div>
						{item.children && isMenuOpen && (
							<i className='icon-arrow-drop-down drop-icon' ></i>
						)}
					</span>
				</span>
				<ul className={`left-arrow sidebar-dropdown dropdown-menu`}>
					{item?.children?.map((subItem) => {
						return (
							<li key={subItem.path}>
								<NavLink
									to={subItem.path}
									activeclassname={`active ${(currentPathSlashIndex === 3 || currentPathSlashIndex === 2) && 'pe-none'}`}>
									<i className='children-icon'>
										<img
											src={subItem.icon}
											alt={isMenuOpen && subItem.title}
										/>
									</i>
									{subItem.title}
								</NavLink>
							</li>
						)
					})}
				</ul>
			</>) : (<>
				<span className={isOpen === true ? "toggle-btn-open" : ""} >
					<NavLink
						to={item.path}
						onClick={toggle}
						activeclassname={`active ${!item.children && 'pe-none'} `}
						className={childPaths?.includes(location.pathname.split('/')[1]) ? 'active pe-none' : ''}>
						<i>
							<img
								src={item.icon}
								alt={isMenuOpen && item.title}
							/>
						</i>
						{isMenuOpen && item.title}
						{item.children && isMenuOpen && (
							<i
								onClick={() => {
									setIsOpen(!isOpen)
								}}
								className='icon-arrow-drop-down drop-icon'></i>
						)}
					</NavLink>
				</span>
			</>)}
		</li>
	)
}
MenuItem.propTypes = {
	item: PropTypes.object,
	isMenuOpen: PropTypes.bool,
}
export default MenuItem
