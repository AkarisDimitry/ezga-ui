import React from 'react';
import { Sparkles, Play, FlaskConical, Repeat, ShieldCheck, Zap } from 'lucide-react';

interface ToolboxItem {
  id: string;
  label: string;
  icon: any;
  category: string;
  data: any;
}

const ITEMS: ToolboxItem[] = [
  // Mutations
  { id: 'm1', label: 'Rattle', icon: Zap, category: 'mutations', data: { factory: 'rattle', kwargs: { std: 0.1, species: [] } } },
  { id: 'm2', label: 'Swap', icon: Repeat, category: 'mutations', data: { factory: 'swap', kwargs: { ID1: 'Ni', ID2: 'O' } } },
  { id: 'm3', label: 'Add Atom', icon: Sparkles, category: 'mutations', data: { factory: 'add', kwargs: { species: ['O'] } } },
  
  // Calculators
  { id: 'c1', label: 'LJ Torch', icon: Play, category: 'calculators', data: { factory: 'ase_calculator', kwargs: { calculator: { factory: 'LJTorch', kwargs: {} }, steps_max: 40, fmax: 1e-4 } } },
  { id: 'c2', label: 'MACE', icon: Play, category: 'calculators', data: { factory: 'ase_calculator', kwargs: { calculator: { factory: 'MACE', kwargs: { model: 'small' } }, steps_max: 100 } } },

  // Evaluators
  { id: 'e1', label: 'Formation E', icon: FlaskConical, category: 'evaluators', data: { factory: 'formation_energy', kwargs: {} } },
  { id: 'e2', label: 'Comp Hull', icon: ShieldCheck, category: 'evaluators', data: { factory: 'distance_to_composition_hull', kwargs: {} } },
];

interface ToolboxProps {
  onAdd: (category: string, data: any) => void;
}

export const Toolbox: React.FC<ToolboxProps> = ({ onAdd }) => {
  const categories = ['mutations', 'calculators', 'evaluators'];

  return (
    <div className="toolbox glass">
      <div className="toolbox-header">
        <Sparkles size={16} color="var(--accent-primary)" />
        <span>Component Toolbox</span>
      </div>
      <div className="toolbox-content">
        {categories.map(cat => (
          <div key={cat} className="toolbox-section">
            <div className="toolbox-section-label">{cat.toUpperCase()}</div>
            <div className="toolbox-grid">
              {ITEMS.filter(i => i.category === cat).map(item => (
                <div 
                  key={item.id} 
                  className="toolbox-item"
                  onClick={() => onAdd(cat, item.data)}
                >
                  <item.icon size={14} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
