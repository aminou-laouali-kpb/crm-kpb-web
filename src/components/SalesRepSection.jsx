import React from 'react';
import { useSalesRepNames } from '@/hooks/useSalesReps';

const SalesRepSection = ({ salesRep, handleSalesRepChange }) => {
  const repNames = useSalesRepNames();
  const missing = !String(salesRep || '').trim();

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold mb-4">Commercial <span className="text-destructive">*</span></h2>
      <select
        value={salesRep}
        onChange={(e) => handleSalesRepChange(e.target.value)}
        className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          missing ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
        }`}
      >
        <option value="">Sélectionner un commercial</option>
        {repNames.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
      {missing && (
        <p className="mt-2 text-xs text-amber-700">
          Obligatoire : choisissez le commercial dans la liste pour activer la génération.
        </p>
      )}
    </div>
  );
};

export default SalesRepSection;
