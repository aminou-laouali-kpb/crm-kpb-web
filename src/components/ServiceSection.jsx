import React from 'react';
import { Label } from "@/components/ui/label";

const ServiceSection = ({ service, handleServiceChange }) => {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold mb-4">Service choisi</h2>
      <Label htmlFor="service" className="text-sm font-medium mb-2 block">
        Description du service
      </Label>
      <textarea
        id="service"
        value={service}
        onChange={handleServiceChange}
        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        rows="4"
        placeholder="Décrivez le service fourni..."
      />
    </div>
  );
};

export default ServiceSection;
