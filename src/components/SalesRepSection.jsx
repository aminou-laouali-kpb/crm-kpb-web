import React from 'react';

const SalesRepSection = ({ salesRep, handleSalesRepChange }) => {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold mb-4">Commercial</h2>
      <select
        value={salesRep}
        onChange={(e) => handleSalesRepChange(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">Sélectionner un commercial</option>
        <option value="Josphin">Josphin</option>
        <option value="Nadia">Nadia</option>
        <option value="Donald">Donald</option>
        <option value="Richard">Richard</option>
      </select>
    </div>
  );
};

export default SalesRepSection;
