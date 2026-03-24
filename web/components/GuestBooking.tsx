import React from 'react';
import Booking from './Booking';

const GuestBooking: React.FC = () => {
  return (
    <div className="pt-16 md:pt-20" data-slot-grouping="enabled">
      <Booking enableSlotGrouping />
    </div>
  );
};

export default GuestBooking;
