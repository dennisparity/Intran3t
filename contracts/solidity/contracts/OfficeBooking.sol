// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract OfficeBooking {
    // locationId => date (YYYY-MM-DD) => resourceId => bookerAddress
    mapping(uint8 => mapping(string => mapping(string => address))) public bookings;

    event BookingCreated(uint8 indexed locationId, string date, string resourceId, address indexed booker);
    event BookingCancelled(uint8 indexed locationId, string date, string resourceId, address indexed booker);

    function book(uint8 locationId, string calldata date, string calldata resourceId) external {
        require(bookings[locationId][date][resourceId] == address(0), "Already booked");
        bookings[locationId][date][resourceId] = msg.sender;
        emit BookingCreated(locationId, date, resourceId, msg.sender);
    }

    function bookBatch(uint8 locationId, string[] calldata dates, string calldata resourceId) external {
        for (uint i = 0; i < dates.length; i++) {
            require(bookings[locationId][dates[i]][resourceId] == address(0), "Already booked for a selected date");
            bookings[locationId][dates[i]][resourceId] = msg.sender;
            emit BookingCreated(locationId, dates[i], resourceId, msg.sender);
        }
    }

    function cancelBooking(uint8 locationId, string calldata date, string calldata resourceId) external {
        require(bookings[locationId][date][resourceId] == msg.sender, "Not your booking");
        bookings[locationId][date][resourceId] = address(0);
        emit BookingCancelled(locationId, date, resourceId, msg.sender);
    }

    function getBooker(uint8 locationId, string calldata date, string calldata resourceId) external view returns (address) {
        return bookings[locationId][date][resourceId];
    }
}
