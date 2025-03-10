import React from "react";

const GuestList = ({ guests, selectedGuest, onSelectGuest }) => {
	return (
		<div className="guest-list">
			<h3>Connected Guests</h3>
			{guests.length === 0 ? (
				<p>No guests connected</p>
			) : (
				<ul>
					{guests.map((guestId) => (
						<li
							key={guestId}
							className={selectedGuest === guestId ? "selected" : ""}
							onClick={() => onSelectGuest(guestId)}
						>
							{guestId}
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

export default GuestList;
