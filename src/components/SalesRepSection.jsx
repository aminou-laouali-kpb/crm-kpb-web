import React from 'react';
import { useSalesRepNames } from '@/hooks/useSalesReps';

const SalesRepSection = ({ salesRep, handleSalesRepChange, locked = false }) => {
  const repNames = useSalesRepNames();
  const missing = !String(salesRep || '').trim();

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold mb-4">Commercial <span className="text-destructive">*</span></h2>
      <select
        value={salesRep}
        onChange={(e) => handleSalesRepChange(e.target.value)}
        disabled={locked}
        className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          missing ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
        } ${locked ? 'bg-muted cursor-not-allowed opacity-80' : ''}`}
      >
        <option value="">Sélectionner un commercial</option>
        {locked && salesRep && !repNames.includes(salesRep) && (
          <option value={salesRep}>{salesRep}</option>
        )}
        {repNames.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
      {locked && (
        <p className="mt-2 text-xs text-muted-foreground">
          Rattaché à votre compte : la vente est enregistrée à votre nom.
        </p>
      )}
      {missing && (
        <p className="mt-2 text-xs text-amber-700">
          Obligatoire : choisissez le commercial dans la liste pour activer la génération.
        </p>
      )}
    </div>
  );
};

export default SalesRepSection;
