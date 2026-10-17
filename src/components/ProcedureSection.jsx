import { Label } from "@/components/ui/label";
import { useProcedureTypes } from '@/hooks/useProcedureTypes';

/** Type de procédure vendue : sert à affecter automatiquement le dossier au bon agent. */
const ProcedureSection = ({
  procedureType,
  onProcedureTypeChange,
  destinationCountry,
  onDestinationCountryChange,
  includesVisa,
  onIncludesVisaChange,
}) => {
  const { data: procedureTypes = [] } = useProcedureTypes();
  const missing = !procedureType;

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold mb-4">Procédure <span className="text-destructive">*</span></h2>
      <Label htmlFor="procedureType" className="text-sm font-medium mb-2 block">
        Type de procédure
      </Label>
      <select
        id="procedureType"
        value={procedureType}
        onChange={(e) => onProcedureTypeChange(e.target.value)}
        className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          missing ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
        }`}
      >
        <option value="">Sélectionner la procédure</option>
        {procedureTypes.filter((t) => t.active).map((t) => (
          <option key={t.code} value={t.code}>{t.label}</option>
        ))}
      </select>
      {missing && (
        <p className="mt-2 text-xs text-amber-700">
          Obligatoire : le dossier sera affecté automatiquement à l’agent de cette procédure.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <Label htmlFor="destinationCountry" className="text-sm font-medium mb-2 block">
            Pays de destination (facultatif)
          </Label>
          <input
            id="destinationCountry"
            type="text"
            value={destinationCountry}
            onChange={(e) => onDestinationCountryChange(e.target.value)}
            maxLength={80}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ex : Japon"
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer md:mt-7">
          <input
            type="checkbox"
            checked={includesVisa}
            onChange={(e) => onIncludesVisaChange(e.target.checked)}
            className="h-4 w-4"
          />
          Accompagnement visa inclus
        </label>
      </div>
    </div>
  );
};

export default ProcedureSection;
