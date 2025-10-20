import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';

const ItemDetails = ({ items, handleItemChange, addItem, removeItem, currencyCode = 'XOF' }) => {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold mb-4">Articles</h2>
      {items.map((item, index) => (
        <div key={index} className="mb-4 p-4 border rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            <input
              type="text"
              placeholder="Nom de l'article"
              value={item.name}
              onChange={(e) => handleItemChange(index, 'name', e.target.value)}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              placeholder="Description"
              value={item.description}
              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <input
              type="number"
              placeholder="Quantité"
              value={item.quantity}
              onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
              className="w-full p-2 border rounded"
              min="0"
            />
            <input
              type="number"
              placeholder="Prix unitaire"
              value={item.amount}
              onChange={(e) => handleItemChange(index, 'amount', parseFloat(e.target.value) || 0)}
              className="w-full p-2 border rounded"
              min="0"
              step="0.01"
            />
            <div className="flex items-center justify-between">
              <span className="font-semibold">{formatCurrency(item.total, currencyCode)}</span>
              {items.length > 1 && (
                <button
                  onClick={() => removeItem(index)}
                  className="text-red-500 hover:text-red-700"
                  type="button"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={addItem}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
        type="button"
      >
        <Plus size={20} />
        Ajouter un article
      </button>
    </div>
  );
};

export default ItemDetails;
